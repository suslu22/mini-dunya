import fs from 'node:fs';
const sim = fs.readFileSync('src/sim.js', 'utf8').replace(/^export /gm, '');
const strip = (s) => s.replace(/^export /gm, '').replace(/^import .*$/gm, '');
const detailLogic = strip(fs.readFileSync('src/detail.js', 'utf8')) + '\n' + strip(fs.readFileSync('src/cozy.js', 'utf8')) + '\n' + strip(fs.readFileSync('src/audio.js', 'utf8'));
const detailParts = ['src/detail_view.js', 'src/human.js', 'src/detail_ui.js', 'src/cozy_view.js', 'src/cozy_ui.js'].map((f) => fs.readFileSync(f, 'utf8')).join('\n');
const hdSrc = fs.readFileSync('src/hd.js', 'utf8'), decorSrc = fs.readFileSync('src/decor.js', 'utf8');
const main = fs.readFileSync('src/main.js', 'utf8').replace('//@@HD@@', () => hdSrc).replace('//@@DECOR@@', () => decorSrc).replace('//@@DETAIL@@', () => detailParts);const THREE_VER = '0.170.0';
const css = `
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none}
html,body{margin:0;height:100%;overflow:hidden;background:#0b1020;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#fff;touch-action:none}
#c{position:fixed;inset:0;width:100%;height:100%;display:block;touch-action:none}
#hud{position:fixed;inset:0;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)}
#hud>*{pointer-events:auto}
.glass{background:rgba(14,20,38,.62);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.14);box-shadow:0 6px 22px rgba(0,0,0,.28)}
#stats{position:absolute;top:10px;left:10px;display:flex;gap:10px;align-items:center;padding:7px 12px;border-radius:14px;font-size:13px;font-weight:600;white-space:nowrap;max-width:calc(100% - 200px);overflow:hidden}
#fps{display:none;opacity:.7;font-weight:500;font-size:11px}
#rainBadge{display:none}
#topbtns{position:absolute;top:10px;right:10px;display:flex;gap:6px}
#camBtns{position:absolute;right:10px;top:50%;transform:translateY(-50%);display:flex;flex-direction:column;gap:6px}
.rb{width:42px;height:42px;border-radius:13px;font-size:18px;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center}
.rb:active{transform:scale(.94)}
#brush{position:absolute;left:50%;transform:translateX(-50%);bottom:calc(124px + env(safe-area-inset-bottom));display:none;align-items:center;gap:10px;padding:8px 14px;border-radius:14px;font-size:12px;font-weight:600}
#brush input{width:150px;accent-color:#7fe0b0}
#dock{position:absolute;left:8px;right:8px;bottom:calc(8px + env(safe-area-inset-bottom));border-radius:20px;padding:8px 8px 8px}
#tabs{display:flex;gap:6px;margin-bottom:7px;overflow-x:auto;scrollbar-width:none}
#tabs::-webkit-scrollbar,#tools::-webkit-scrollbar{display:none}
.tab{flex:1 0 auto;min-width:64px;height:34px;border-radius:12px;border:0;background:rgba(255,255,255,.07);color:#cfd6ea;font-size:12px;font-weight:600;cursor:pointer;padding:0 10px;display:flex;align-items:center;justify-content:center;gap:5px}
.tab span{font-size:15px}
.tab.cur{background:rgba(255,255,255,.2);color:#fff}
.tab.hand{flex:0 0 44px;min-width:44px;font-size:18px;padding:0}
.tab.hand.on{background:#7fe0b0;color:#08231a}
#tools{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none}
.tool{flex:0 0 62px;height:58px;border-radius:14px;border:0;background:rgba(255,255,255,.08);color:#e6ebf8;font-size:11px;font-weight:600;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px}
.tool span{font-size:22px;line-height:1}
.tool.on{background:#7fe0b0;color:#08231a;box-shadow:0 0 0 2px rgba(127,224,176,.45)}
.tool:active{transform:scale(.95)}
#settings{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(5,8,18,.5);z-index:10}
#settings[hidden]{display:none}
#panel{width:min(92vw,400px);max-height:88vh;overflow:auto;border-radius:20px;padding:16px 18px;background:rgba(18,26,48,.94);border:1px solid rgba(255,255,255,.16)}
#panel h3{margin:0 0 12px;font-size:17px}
.row{margin:14px 0 6px;font-size:12px;font-weight:700;color:#aeb8d6;letter-spacing:.3px;text-transform:uppercase}
.seg{display:flex;gap:6px}
.seg button{flex:1;height:38px;border-radius:11px;border:0;background:rgba(255,255,255,.09);color:#e6ebf8;font-size:13px;font-weight:600;cursor:pointer}
.seg button.on{background:#7fe0b0;color:#08231a}
#panel input[type=range]{width:100%;accent-color:#7fe0b0}
.big{width:100%;height:44px;margin-top:16px;border:0;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;color:#fff;background:#3b6df0}
.big.alt{background:rgba(255,255,255,.12)}
#qlabel{font-size:11px;color:#8fa0cc;margin-top:6px}
#toast{position:fixed;left:50%;top:64px;transform:translate(-50%,-10px);background:rgba(10,14,28,.85);padding:8px 14px;border-radius:12px;font-size:13px;font-weight:600;opacity:0;transition:.25s;pointer-events:none;max-width:90vw;text-align:center}
#toast.show{opacity:1;transform:translate(-50%,0)}
#flash{position:fixed;inset:0;background:#fff;opacity:0;pointer-events:none}
#loading{position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;background:#0b1020;z-index:20;font-size:15px;text-align:center;padding:24px}
#loading b{font-size:22px}
body.inmenu #hud{display:none}
#menu{position:fixed;inset:0;z-index:12;display:flex;align-items:center;justify-content:space-between;gap:24px;padding:clamp(18px,5vw,64px);background:linear-gradient(90deg,rgba(6,10,24,.78) 0%,rgba(6,10,24,.28) 52%,rgba(6,10,24,.6) 100%);touch-action:auto}
#menu[hidden]{display:none}
.mleft{max-width:440px}
.mtitle{font-size:clamp(40px,8vw,84px);font-weight:800;letter-spacing:-1.5px;line-height:.98;text-shadow:0 4px 28px rgba(0,0,0,.45)}
.mtitle small{display:block;font-size:.34em;letter-spacing:.2px;font-weight:600;color:#b9c6ea;margin-top:12px;line-height:1.3}
.mbtns{display:flex;flex-direction:column;gap:10px;margin-top:28px;max-width:300px}
.mbtn{height:54px;border:0;border-radius:15px;font-size:17px;font-weight:700;cursor:pointer;color:#fff;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.18);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
.mbtn.play{background:#7fe0b0;color:#08231a;border-color:transparent;font-size:19px;box-shadow:0 8px 26px rgba(127,224,176,.35)}
.mbtn:active{transform:scale(.97)}
#gfx{width:270px;border-radius:20px;padding:16px 16px 14px;flex:0 0 auto}
#gfx h4{margin:0 0 10px;font-size:16px;letter-spacing:.2px}
.gq{display:flex;flex-direction:column;gap:6px}
.gq button,.seg button.qb{height:38px;border-radius:11px;border:0;background:rgba(255,255,255,.09);color:#e6ebf8;font-size:14px;font-weight:600;cursor:pointer;text-align:left;padding:0 13px}
.gq button.on,.seg button.qb.on{background:#7fe0b0;color:#08231a}
#gdesc{font-size:11.5px;color:#9fb0dc;margin:8px 2px 0;min-height:15px}
.sw{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:14px;padding-top:12px;border-top:1px solid rgba(255,255,255,.12);font-size:14px;font-weight:600;cursor:pointer}
.sw input{position:absolute;opacity:0;pointer-events:none}
.sw i{flex:0 0 46px;height:26px;border-radius:13px;background:rgba(255,255,255,.18);position:relative;transition:.2s}
.sw i::after{content:'';position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#fff;transition:.2s}
.sw input:checked+i{background:#7fe0b0}
.sw input:checked+i::after{left:23px;background:#08231a}
.shint{font-size:11px;color:#8fa0cc;margin-top:6px}
.seg.wrap{flex-wrap:wrap}
.seg.wrap button{flex:1 0 30%}
@media (max-width:760px){
  #menu{flex-direction:column;align-items:stretch;justify-content:center;gap:18px;overflow:auto;background:linear-gradient(180deg,rgba(6,10,24,.7),rgba(6,10,24,.4) 50%,rgba(6,10,24,.75))}
  .mleft{max-width:none}.mbtns{max-width:none;flex-direction:row;margin-top:16px}.mbtn{flex:1;font-size:15px;height:50px}
  #gfx{width:auto}.gq{display:grid;grid-template-columns:1fr 1fr}
}
#saves{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(5,8,18,.55);z-index:14}
#saves[hidden]{display:none}
#spanel{width:min(94vw,440px);max-height:88vh;overflow:auto;border-radius:20px;padding:16px 18px;background:rgba(18,26,48,.96);border:1px solid rgba(255,255,255,.16)}
#spanel h3{margin:0 0 12px;font-size:17px}
.slot{display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:10px;border-radius:14px;background:rgba(255,255,255,.07);margin-bottom:8px}
.slot .si{flex:1 1 150px;min-width:0}
.slot b{display:block;font-size:14px}
.slot small{display:block;font-size:11.5px;color:#9fb0dc;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.slot button{height:36px;min-width:38px;padding:0 10px;border:0;border-radius:10px;background:rgba(255,255,255,.12);color:#fff;font-size:13px;font-weight:700;cursor:pointer}
.slot button.sv{background:#a855f7}
.slot button.ask{background:#c0392b}
.slot button:disabled{opacity:.3;cursor:default}
#floppy{position:fixed;top:calc(62px + env(safe-area-inset-top));right:calc(12px + env(safe-area-inset-right));z-index:15;width:46px;height:46px;opacity:0;transform:scale(.7);pointer-events:none;transition:opacity .3s,transform .3s;filter:drop-shadow(0 4px 12px rgba(168,85,247,.6))}
#floppy.show{opacity:1;transform:scale(1);animation:flpulse .8s ease-in-out 2}
@keyframes flpulse{0%,100%{transform:scale(1)}50%{transform:scale(1.14)}}
.modes{display:flex;flex-direction:column;gap:8px;margin-top:24px;max-width:340px}
.mode{border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.08);color:#fff;border-radius:15px;padding:11px 14px;text-align:left;cursor:pointer;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
.mode b{display:block;font-size:16px}.mode small{display:block;font-size:11.5px;color:#b9c6ea;margin-top:3px;line-height:1.35}
.mode.on{background:rgba(127,224,176,.2);border-color:#7fe0b0;box-shadow:0 0 0 2px rgba(127,224,176,.25)}
@media (max-width:760px){.modes{max-width:none;flex-direction:row}.mode{flex:1}.mode small{display:none}}
body:not(.dmode) #dbar,body:not(.dmode) #dppl,body:not(.dmode) #dpanel,body:not(.dmode) #dbpanel,body:not(.dmode) #dlabels{display:none!important}
body.inmenu #dlabels,body.inmenu #tree,body.inmenu #evm,body.inmenu #dlog{display:none!important}
#dbar{position:absolute;top:52px;left:10px;display:flex;gap:4px;align-items:center;padding:5px 8px;border-radius:14px;font-size:13px;font-weight:700;max-width:calc(100% - 20px);overflow-x:auto;scrollbar-width:none}
#dbar::-webkit-scrollbar,#dppl::-webkit-scrollbar{display:none}
.rc{display:inline-flex;align-items:center;gap:3px;padding:3px 8px;border-radius:10px;background:rgba(255,255,255,.08);color:#fff;border:0;font:inherit;white-space:nowrap;cursor:default;position:relative}
.rc[data-k=goods]{cursor:pointer;background:rgba(183,163,242,.2)}
.rc.low{background:rgba(239,106,90,.35)}
.rc.star{cursor:pointer;background:rgba(242,193,78,.25);overflow:hidden}
.rc.star i{position:absolute;left:0;right:0;bottom:0;height:3px;background:rgba(0,0,0,.3)}.rc.star u{display:block;height:100%;background:#f2c14e}
.rc.star.pulse{animation:flpulse 1s ease-in-out infinite;box-shadow:0 0 0 2px #f2c14e}
#dppl{position:absolute;top:92px;left:10px;display:flex;gap:5px;padding:5px 6px;border-radius:14px;max-width:calc(100% - 70px);overflow-x:auto;scrollbar-width:none}
.chip{flex:0 0 auto;border:0;border-radius:10px;padding:4px 9px;background:rgba(255,255,255,.1);color:#fff;font-size:12.5px;font-weight:600;cursor:pointer}
.chip.sel{background:#7fe0b0;color:#08231a}.chip.add{background:rgba(127,224,176,.25)}
#dpanel,#dbpanel{position:absolute;top:132px;left:10px;width:min(300px,calc(100% - 78px));max-height:calc(100% - 270px);overflow-y:auto;border-radius:16px;padding:10px 12px;font-size:12.5px;scrollbar-width:thin}
#dpanel[hidden],#dbpanel[hidden]{display:none}
.ph{display:flex;gap:6px;align-items:center}
.ph input{flex:1;min-width:0;height:34px;border-radius:10px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.08);color:#fff;font-size:16px;font-weight:800;padding:0 10px;user-select:text;-webkit-user-select:text}
.ph .bt{flex:1;font-size:16px}
.ph button,.pbtn button,.jobs button{border:0;border-radius:9px;background:rgba(255,255,255,.12);color:#fff;font-size:12.5px;font-weight:600;cursor:pointer;height:32px;padding:0 9px}
.ph button.on{background:#7fe0b0;color:#08231a}
.psub{color:#aeb8d6;margin:5px 1px 6px;font-size:12px}
.pmood{display:flex;align-items:center;gap:8px}.pmood span{font-size:26px}.pmood b{width:26px;text-align:right}
.bar{flex:1;height:8px;border-radius:5px;background:rgba(255,255,255,.12);overflow:hidden}.bar i{display:block;height:100%;width:0;border-radius:5px;transition:width .4s}
.pact{margin:4px 0;color:#d6defa;font-weight:600}
.pth{display:flex;flex-wrap:wrap;gap:4px}.pth span,.prel span{padding:2px 7px;border-radius:8px;background:rgba(255,255,255,.09);font-size:11.5px}
.pos{background:rgba(127,224,176,.2)!important}.neg{background:rgba(239,106,90,.25)!important}
#dpanel h5{margin:10px 0 4px;font-size:11px;letter-spacing:.4px;text-transform:uppercase;color:#aeb8d6}#dpanel h5 small{text-transform:none;letter-spacing:0;opacity:.8}
.nr,.sr{display:flex;align-items:center;gap:7px;margin:3px 0}.nr>span{flex:0 0 112px;white-space:nowrap}.nr em{font-style:normal;color:#8fa0cc;font-size:11px}
.sr>span{flex:0 0 96px;white-space:nowrap}.sr b{width:16px;text-align:right}
.sr button{width:24px;height:24px;border:0;border-radius:7px;background:rgba(255,255,255,.14);color:#fff;font-size:15px;line-height:1;cursor:pointer;padding:0}
.sb i{background:#7aa7ff}
.jobs{display:flex;flex-wrap:wrap;gap:4px}.jobs button{height:28px;font-size:11.5px}.jobs button.on{background:#7fe0b0;color:#08231a}
.pbtn{display:flex;gap:6px;margin-top:10px}.pbtn button{flex:1}.pbtn button.ask{background:#c0392b}
.binfo{margin:4px 0;color:#d6defa;line-height:1.5}
#dlabels{position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:2}
.dlabel{position:absolute;left:0;top:0;white-space:nowrap;font-size:12px;font-weight:700;padding:2px 8px 2px 4px;border-radius:11px;background:rgba(10,14,28,.62);color:#fff;pointer-events:auto;cursor:pointer;text-shadow:0 1px 2px #000;will-change:transform}
#dcmd{position:fixed;z-index:9;min-width:168px;max-width:240px;padding:6px;border-radius:14px;display:flex;flex-direction:column;gap:5px;box-shadow:0 8px 28px rgba(0,0,0,.4)}
#dcmd .ct{font-size:11.5px;color:#cfd8f4;padding:2px 6px 3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#dcmd button{min-height:40px;border:0;border-radius:10px;background:rgba(255,255,255,.14);color:#fff;font-size:14px;font-weight:700;text-align:left;padding:0 12px;cursor:pointer}
#dcmd button:first-of-type{background:#7fe0b0;color:#08231a}#dcmd button:hover{filter:brightness(1.12)}
body:not(.dmode) #dcmd,body.inmenu #dcmd{display:none!important}
.dlabel span{margin-right:3px}.dlabel i{font-style:normal;margin-left:2px}.dlabel.sel{background:#2e8a63}
.tool.locked{opacity:.55}.tool small{font-size:9.5px;opacity:.8;font-weight:600;line-height:1}
body.dmode .tool{height:64px}
.modal{position:fixed;inset:0;z-index:16;display:flex;align-items:center;justify-content:center;background:rgba(5,8,18,.6);touch-action:auto}
.modal[hidden]{display:none}
.mbox{max-width:min(94vw,640px);max-height:90vh;overflow:auto;border-radius:20px;padding:16px 18px;background:rgba(18,26,48,.97);border:1px solid rgba(255,255,255,.16)}
#evm .mbox{width:min(94vw,440px)}
.evt{font-size:19px;font-weight:800;margin-bottom:8px}.evx{font-size:14px;line-height:1.5;color:#e1e7fb;margin:8px 0 12px}
.evpp{display:flex;gap:12px;margin:4px 0}.evp{text-align:center;font-size:11.5px}.evf{width:50px;height:50px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:28px;margin:0 auto 3px;border:2px solid rgba(255,255,255,.4)}
#evIn{width:100%;height:42px;border-radius:12px;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.1);color:#fff;font-size:17px;font-weight:700;padding:0 12px;margin-bottom:10px;user-select:text;-webkit-user-select:text}
.evc{display:flex;flex-direction:column;gap:7px}.evc button,#treeInfo button,#logClose,#treeClose{min-height:44px;border:0;border-radius:12px;background:rgba(255,255,255,.14);color:#fff;font-size:14px;font-weight:700;cursor:pointer;padding:6px 12px;text-align:left}
.evc button:hover{background:rgba(255,255,255,.24)}.evc button.ok{background:#7fe0b0;color:#08231a;text-align:center}
.evr{margin-top:10px;padding:10px 12px;border-radius:12px;background:rgba(127,224,176,.16);font-weight:600}
#tree .mbox{width:min(96vw,700px);padding:12px 12px 14px}
.thd{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 4px 8px}.thd b{font-size:18px}.thd span{color:#f2c14e;font-weight:800}
#treeClose,#logClose{min-height:36px;text-align:center}
#treeWrap{overflow:auto;border-radius:14px;background:rgba(255,255,255,.04);max-height:62vh;touch-action:pan-x pan-y}
#treeCanvas{position:relative}#treeCanvas svg{position:absolute;left:0;top:0;pointer-events:none}
.tl{position:absolute;font-size:11px;font-weight:800;letter-spacing:.5px;text-transform:uppercase}
.tn{position:absolute;width:92px;height:74px;border-radius:14px;border:2px solid rgba(255,255,255,.18);background:rgba(30,40,70,.9);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;cursor:pointer;padding:2px}
.tn span{font-size:24px;line-height:1}.tn b{font-size:11px;line-height:1.1;text-align:center}.tn i{font-style:normal;font-size:10.5px;opacity:.85;font-weight:700}
.tn.got{background:var(--bc);border-color:#fff;color:#10151f}.tn.can{border-color:var(--bc);animation:flpulse 1.1s ease-in-out infinite;box-shadow:0 0 14px var(--bc)}
.tn.cost{opacity:.85;border-color:rgba(255,255,255,.3)}.tn.lock{opacity:.45}.tn.sel{outline:3px solid #fff;outline-offset:2px}
#treeInfo{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:10px 4px 0;font-size:13px;line-height:1.45;min-height:48px}#treeInfo span,#treeInfo small{color:#b9c6ea}#treeInfo em{font-style:normal;color:#f2c14e;font-weight:700}
#treeInfo button{background:#f2c14e;color:#2a1c00;white-space:nowrap}
#dlog .mbox{width:min(94vw,420px)}#dlogList div{padding:6px 2px;border-bottom:1px solid rgba(255,255,255,.1);font-size:13px}
/* ---- Ada Modu ---- */
body:not(.cmode) #czhud,body:not(.cmode) #czm,body:not(.cmode) #clabels,body:not(.cmode) #cfloat,body:not(.cmode) #czfade{display:none!important}
body.inmenu #czhud,body.inmenu #clabels,body.inmenu #cfloat,body.inmenu #czm{display:none!important}
body.cmode #stats,body.cmode #dock,body.cmode #camBtns,body.cmode #brush,body.cmode #bSpeed,body.cmode #dbar,body.cmode #dppl{display:none!important}
#czhud{position:fixed;inset:0;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)}
#czhud>*{pointer-events:auto}
#czleft{position:absolute;top:10px;left:10px;display:flex;flex-direction:column;align-items:flex-start;gap:6px;max-width:calc(100% - 196px)}
#czstats{display:flex;gap:10px;align-items:center;padding:7px 12px;border-radius:14px;font-size:13px;font-weight:700;white-space:nowrap;max-width:100%;overflow:hidden}
#czfps{display:none;padding:3px 10px;border-radius:10px;font-size:11px;font-weight:600;background:rgba(10,14,28,.6);color:#dfe6fa;white-space:nowrap}
body.showfps #fps,body.showfps #czfps{display:inline-block}
#czcam{position:absolute;right:10px;top:60px;display:flex;flex-direction:column;gap:6px}
#czbar{position:absolute;left:50%;transform:translateX(-50%);bottom:calc(10px + env(safe-area-inset-bottom));display:flex;gap:6px;padding:7px;border-radius:19px}
.czt{position:relative;flex:0 0 auto;width:50px;height:50px;border-radius:14px;border:0;background:rgba(255,255,255,.09);color:#fff;font-size:24px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0}
.czt i{position:absolute;left:5px;top:2px;font-size:10px;font-style:normal;opacity:.7;font-weight:800}
.czt b{position:absolute;right:4px;bottom:1px;font-size:11px}
.czt.on{background:#ffd27a;box-shadow:0 0 0 2px rgba(255,210,122,.45)}.czt.on i,.czt.on b{color:#3a2a08}
.czt:active{transform:scale(.94)}
#czprompt{position:absolute;left:50%;transform:translateX(-50%);bottom:calc(76px + env(safe-area-inset-bottom));padding:6px 15px;border-radius:14px;background:rgba(10,14,28,.72);font-size:14px;font-weight:700;white-space:nowrap;max-width:80vw;overflow:hidden;text-overflow:ellipsis;opacity:0;transition:opacity .15s;pointer-events:none!important}
#czprompt.on{opacity:1}
#czact{position:absolute;right:16px;bottom:calc(12px + env(safe-area-inset-bottom));width:66px;height:66px;border-radius:50%;font-size:28px;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;transition:opacity .15s,background .15s}
#czact:not(.dim){background:rgba(255,210,122,.82);border-color:#ffd27a}
#czact.dim{opacity:.6}
#czact:active{transform:scale(.92)}
#czjoy{position:absolute;left:18px;bottom:calc(86px + env(safe-area-inset-bottom));width:116px;height:116px;border-radius:50%;background:rgba(255,255,255,.1);border:2px solid rgba(255,255,255,.28);display:none;touch-action:none}
#czjoy i{position:absolute;left:50%;top:50%;width:52px;height:52px;margin:-26px 0 0 -26px;border-radius:50%;background:rgba(255,255,255,.5);pointer-events:none}
@media (pointer:coarse),(max-width:760px){
  #czjoy{display:block}
  #czact{bottom:calc(86px + env(safe-area-inset-bottom));width:78px;height:78px;font-size:32px}
  #czprompt{bottom:calc(76px + env(safe-area-inset-bottom))}
}
@media (max-width:480px){.czt{width:42px;height:42px;font-size:21px}#czbar{gap:4px;padding:6px}#czleft{max-width:calc(100% - 158px)}#czstats{font-size:12px;gap:2px 8px;padding:6px 9px;flex-wrap:wrap;width:max-content}}
/* ---- tooltip (fare imleci üstüne gelince) ---- */
#tip{position:fixed;left:0;top:0;z-index:60;max-width:min(260px,calc(100vw - 16px));padding:8px 12px 9px;border-radius:12px;background:rgba(14,19,38,.96);border:1px solid rgba(255,255,255,.2);box-shadow:0 8px 24px rgba(0,0,0,.5);color:#eaf0ff;font-size:12.5px;line-height:1.4;font-weight:500;pointer-events:none;opacity:0;transform:translateY(4px);transition:opacity .12s,transform .12s}
#tip.on{opacity:1;transform:none}
#tip b{display:block;font-size:13px;font-weight:800;color:#ffd27a}
#tip span{display:block;margin-top:2px;color:#cfd8f4;white-space:pre-line}
#tip kbd{display:inline-block;margin-top:5px;padding:1px 7px;border-radius:6px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.22);font-family:inherit;font-size:11px;font-weight:700;color:#fff}
@media (hover:none){#tip{display:none}}
#clabels,#cfloat{position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:2}
#cfloat{z-index:3}
.cfl{position:absolute;transform:translate(-50%,0);font-weight:800;font-size:15px;text-shadow:0 2px 5px #000;white-space:nowrap;animation:cflup 1.5s ease-out forwards}
@keyframes cflup{0%{opacity:0;margin-top:0}12%{opacity:1}100%{opacity:0;margin-top:-64px}}
#czfade{position:fixed;inset:0;background:#05070f;opacity:0;pointer-events:none;transition:opacity .6s;z-index:17}
#czfade.on{opacity:1;pointer-events:auto}
#czm .mbox{width:min(94vw,520px);padding:14px 16px}
#czm.side{justify-content:flex-end;align-items:stretch;background:transparent;pointer-events:none}
#czm.side .mbox{pointer-events:auto;margin:12px;max-height:calc(100% - 24px);width:min(92vw,350px)}
@media (max-width:760px){#czm.side{align-items:flex-end;justify-content:center}#czm.side .mbox{width:calc(100% - 16px);margin:8px;max-height:46vh}}
.czh{display:flex;align-items:center;gap:10px;margin-bottom:10px}.czh b{font-size:18px;flex:1}.czh span{font-size:12.5px;color:#cfd8f4;font-weight:700}
.czx{width:34px;height:34px;border:0;border-radius:11px;background:rgba(255,255,255,.14);color:#fff;font-size:15px;font-weight:800;cursor:pointer}
#czm h5{margin:12px 2px 6px;font-size:11px;letter-spacing:.4px;text-transform:uppercase;color:#aeb8d6}
.czgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(54px,1fr));gap:6px}
.czi{position:relative;height:54px;border-radius:13px;border:2px solid transparent;background:rgba(255,255,255,.09);color:#fff;font-size:26px;cursor:pointer;padding:0}
.czi b{position:absolute;right:5px;bottom:2px;font-size:11.5px;text-shadow:0 1px 2px #000}
.czi.sel{border-color:#ffd27a;background:rgba(255,210,122,.2)}
.czinfo{margin-top:12px;padding:10px 12px;border-radius:14px;background:rgba(255,255,255,.07)}
.czit{font-size:16px;font-weight:800}.czit small{font-size:12px;color:#cfd8f4}
.czsub{font-size:12.5px;color:#b9c6ea;line-height:1.45}
.czbt{display:flex;gap:6px;margin-top:8px;flex-wrap:wrap}
.czbt button,.czrow button,.czquick button,.czseg button,.czbig button{border:0;border-radius:11px;background:rgba(255,255,255,.14);color:#fff;font-size:13.5px;font-weight:700;cursor:pointer;min-height:36px;padding:0 13px}
.czbt button{background:#7fe0b0;color:#08231a}
.czbt button:active,.czrow button:active,.czbig button:active{transform:scale(.96)}
.czemp{padding:22px 8px;text-align:center;color:#aeb8d6;font-size:13.5px}
.czseg{display:flex;gap:6px;margin-bottom:6px}.czseg button{flex:1}.czseg button.on{background:#ffd27a;color:#3a2a08}
.czrow{display:flex;align-items:center;gap:9px;padding:7px 4px;border-bottom:1px solid rgba(255,255,255,.08)}
.czrow .ci{font-size:24px;flex:0 0 30px;text-align:center}.czrow .cn{flex:1;min-width:0;font-weight:700;font-size:14px}.czrow .cn small{color:#aeb8d6;font-weight:600}
.czrow .cp{font-size:12.5px;color:#ffd27a;font-weight:700;white-space:nowrap}
.czrow button{background:#7fe0b0;color:#08231a;min-width:46px}.czrow button:disabled,.czbig button:disabled{opacity:.35;cursor:default}
.cneed{display:flex;gap:6px;flex-wrap:wrap;margin-top:3px;font-size:11.5px;font-weight:700}.cneed .ok{color:#7fe0b0}.cneed .no{color:#ef6a5a}
.czquick{display:flex;gap:6px;flex-wrap:wrap;margin:4px 0 6px}.czquick button{min-height:32px;font-size:12.5px;background:rgba(255,210,122,.22)}
.czcards{display:grid;grid-template-columns:repeat(auto-fill,minmax(112px,1fr));gap:7px;margin-top:6px}
.czcard{display:flex;flex-direction:column;align-items:center;gap:1px;padding:8px 4px;border-radius:13px;background:rgba(255,255,255,.09);text-align:center}
.czcard span{font-size:28px}.czcard b{font-size:12.5px}.czcard small{font-size:10.5px;color:#b9c6ea}.czcard.off{opacity:.5}
.czbig{display:flex;flex-direction:column;gap:7px;margin-top:12px}.czbig button{min-height:44px;font-size:14.5px;text-align:left;padding:0 14px}
.czbig.two{flex-direction:row}.czbig.two button{flex:1;text-align:center}.czbig button.go{background:#7fe0b0;color:#08231a}
.czstars{text-align:center;font-size:32px;letter-spacing:3px;margin:2px 0}.czstars span{opacity:.35}
.czbar{display:flex;align-items:center;gap:9px;margin:7px 0;font-size:13px;font-weight:700}.czbar>span{flex:0 0 108px}.czbar>div{flex:1;height:9px;border-radius:5px;background:rgba(255,255,255,.12);overflow:hidden}.czbar i{display:block;height:100%;border-radius:5px;background:linear-gradient(90deg,#7fe0b0,#ffd27a)}.czbar small{flex:0 0 74px;text-align:right;color:#cfd8f4}
.czstat{display:flex;flex-wrap:wrap;gap:7px;margin-top:8px}.czstat span{padding:4px 10px;border-radius:10px;background:rgba(255,255,255,.1);font-size:13px;font-weight:700}
.czsay{padding:12px 14px;border-radius:16px;background:rgba(255,255,255,.1);font-size:15px;line-height:1.5;margin-bottom:10px}
.czquest{padding:9px 12px;border-radius:14px;background:rgba(255,210,122,.16);font-size:13.5px;line-height:1.5}.czquest.done{background:rgba(127,224,176,.16)}
.czquest small{color:#cfd8f4}
.czsws{display:flex;flex-wrap:wrap;gap:7px}.czsw{width:30px;height:30px;border-radius:50%;border:2px solid rgba(255,255,255,.25);cursor:pointer;padding:0}.czsw.on{border-color:#fff;box-shadow:0 0 0 3px rgba(255,210,122,.8)}
.czopts{display:flex;flex-wrap:wrap;gap:6px}.czo{border:0;border-radius:10px;background:rgba(255,255,255,.12);color:#fff;font-size:13px;font-weight:700;cursor:pointer;min-height:32px;padding:0 11px}.czo.on{background:#ffd27a;color:#3a2a08}
#czName{width:100%;height:40px;border-radius:12px;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.1);color:#fff;font-size:16px;font-weight:700;padding:0 12px;user-select:text;-webkit-user-select:text}
#err{position:fixed;left:10px;right:10px;bottom:10px;background:rgba(150,20,20,.92);padding:10px 12px;border-radius:12px;font-size:12px;z-index:30;display:none;user-select:text;-webkit-user-select:text;word-break:break-word}
`;
const html = `<!DOCTYPE html>
<html lang="tr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<title>Mini Dünya</title>
<style>${css}</style>
<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@${THREE_VER}/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@${THREE_VER}/examples/jsm/"}}</script>
</head><body>
<canvas id="c"></canvas>
<div id="hud">
  <div id="stats" class="glass"><span id="pop">👥 0</span><span id="houses">🏠 0</span><span id="clock">☀️ 08:00 · Gün 1</span><span id="rainBadge">🌧️</span><span id="fps"></span></div>
  <div id="dbar" class="glass"></div><div id="dppl" class="glass"></div>
  <div id="dpanel" class="glass" hidden></div><div id="dbpanel" class="glass" hidden></div>
  <div id="topbtns"><button class="rb glass" id="bPause" data-tip="Duraklat / Devam|Oyunu durdurur ya da kaldığı yerden sürdürür.|P">⏸</button><button class="rb glass" id="bSpeed" style="font-size:13px;font-weight:700" data-tip="Oyun hızı|Zamanı 1×, 2× ve 4× hızlandırır.">1×</button><button class="rb glass" id="bSave" data-tip="Kayıtlar|Oyunu kaydet, kayıt yükle, dosyaya aktar ya da dosyadan içe aktar.">💾</button><button class="rb glass" id="bSet" data-tip="Ayarlar|Grafik kalitesi, FPS göstergesi, gün/gece hızı ve diğer seçenekler.">⚙️</button></div>
  <div id="camBtns"><button class="rb glass" id="bRotL" data-tip="Kamerayı sola çevir|Haritayı sola döndürür.|Q">⟲</button><button class="rb glass" id="bRotR" data-tip="Kamerayı sağa çevir|Haritayı sağa döndürür.|E">⟳</button><button class="rb glass" id="bTilt" data-tip="Kamera eğimi|Kamerayı yukarıdan bakıştan yatay bakışa doğru çevirir.|R / F">⤢</button></div>
  <div id="brush" class="glass"><span>Fırça</span><input id="size" type="range" min="1" max="10" value="4"><span id="sizev">4</span></div>
  <div id="dock" class="glass"><div id="tabs"></div><div id="tools"></div></div>
</div>
<div id="czhud">
  <div id="czleft"><div id="czstats" class="glass"></div><div id="czfps"></div></div>
  <div id="czcam"><button class="rb glass" id="czCamB" data-tip="Kamera|Kamera modunu değiştirir: üçüncü şahıs, birinci şahıs, izometrik.|C">🎥</button><button class="rb glass" id="czRotL" data-tip="Kamerayı sola çevir|Kamerayı karakterin etrafında sola döndürür.|Q">⟲</button><button class="rb glass" id="czRotR" data-tip="Kamerayı sağa çevir|Kamerayı karakterin etrafında sağa döndürür.|R">⟳</button><button class="rb glass" id="czBagB" data-tip="Çanta|Topladığın eşyalar; yiyebilir, eline alabilir, yerleştirebilirsin.|B">🎒</button><button class="rb glass" id="czCatB" data-tip="Rehber|Yakaladığın balık, böcek ve fosillerin kataloğu.|V">📖</button></div>
  <div id="czprompt"></div>
  <div id="czbar" class="glass"></div>
  <button id="czact" class="glass dim" data-tip="Eylem|Seçili aracınla imlecin gösterdiği işi yapar: konuş, topla, kaz, balık tut…|Boşluk / E">✋</button>
  <div id="czjoy"><i></i></div>
</div>
<div id="czm" class="modal" hidden><div class="mbox glass"></div></div>
<div id="czfade"></div>
<div id="settings" hidden><div id="panel">
  <h3>⚙️ Ayarlar</h3>
  <div class="row">Grafik kalitesi</div>
  <div class="seg wrap"><button class="qb" data-q="auto">Oto</button><button class="qb" data-q="low">Düşük</button><button class="qb" data-q="mid">Orta</button><button class="qb" data-q="high">Yüksek</button><button class="qb" data-q="ultra">Ultra</button><button class="qb" data-q="uplus">Ultra+</button></div>
  <div id="qlabel"></div>
  <div class="row">Low-Poly grafikleri</div>
  <div class="seg"><button data-style="low">Açık</button><button data-style="real">Kapalı</button></div>
  <div class="row">Tilt-shift (maket görünümü)</div>
  <div class="seg"><button data-tilt="on">Açık</button><button data-tilt="off">Kapalı</button></div>
  <div class="shint">Tilt-shift, parlama ve HD dokular Yüksek ve üzeri kalitede çalışır.</div>
  <div class="row">Savaşlar</div>
  <div class="seg" id="segW"><button data-v="on">Açık</button><button data-v="off">Kapalı</button></div>
  <div class="row">Gün/gece hızı: <span id="timeSpdV">1×</span></div>
  <input id="timeSpd" type="range" min="0" max="4" step="0.5" value="1">
  <div class="row">Ses ve müzik</div>
  <label class="sw" style="margin-top:6px;padding-top:8px"><span>🔊 Ses efektleri</span><input type="checkbox" id="aSfx"><i></i></label>
  <label class="sw" style="margin-top:6px;padding-top:8px"><span>🌿 Ortam sesleri</span><input type="checkbox" id="aAmb"><i></i></label>
  <label class="sw" style="margin-top:6px;padding-top:8px"><span>🎵 Müzik</span><input type="checkbox" id="aMus"><i></i></label>
  <input id="aVol" type="range" min="0" max="1" step="0.05" style="margin-top:8px" data-tip="Ses seviyesi|Tüm seslerin ana ses düzeyi.">
  <div class="row">FPS göstergesi</div>
  <div class="seg" id="segF"><button data-v="on">Açık</button><button data-v="off">Kapalı</button></div>
  <button class="big" id="bNew">🌍 Yeni dünya oluştur</button>
  <button class="big alt" id="bMenu">🏠 Ana menü</button>
  <button class="big alt" id="closeSet">Kapat</button>
</div></div>
<div id="saves" hidden><div id="spanel">
  <h3>💾 Kayıtlar</h3>
  <div id="slots"></div>
  <div class="shint">Oyun her 5 dakikada bir kendiliğinden kaydedilir (Oto-kayıt). Kayıtlar bu tarayıcıda ve bu adreste saklanır. Başka tarayıcıya, telefona ya da siteye taşımak için ⬇ ile dosyaya indir, orada ⬆ ile yükle.</div>
  <button class="big alt" id="closeSaves">Kapat</button>
</div></div>
<div id="tree" class="modal" hidden><div class="mbox glass">
  <div class="thd"><b>⭐ Beceri Ağacı</b><span>Puan: <span id="treePts">0</span> · <small id="treeLv"></small></span><button id="treeClose">Kapat ✕</button></div>
  <div id="treeWrap"><div id="treeCanvas"></div></div>
  <div id="treeInfo"></div>
</div></div>
<div id="evm" class="modal" hidden><div class="mbox glass"></div></div>
<div id="dlog" class="modal" hidden><div class="mbox glass"><div class="thd"><b>📜 Olay günlüğü</b><button id="logClose">Kapat ✕</button></div><div id="dlogList"></div></div></div>
<div id="floppy"><svg viewBox="0 0 48 48" width="46" height="46"><path d="M6 6h31l5 5v31a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z" fill="#a855f7" stroke="#e9d5ff" stroke-width="2" stroke-linejoin="round"/><rect x="13" y="6" width="20" height="13" rx="1.5" fill="#f3e8ff"/><rect x="26" y="9" width="4" height="8" rx="1" fill="#7e22ce"/><rect x="11" y="26" width="26" height="16" rx="2" fill="#6b21a8"/><rect x="15" y="30" width="18" height="2" fill="#d8b4fe"/><rect x="15" y="35" width="12" height="2" fill="#d8b4fe"/></svg></div>
<div id="menu">
  <div class="mleft">
    <div class="mtitle">Mini Dünya<small>Kendi dünyanı şekillendir, halkını yönet, felaketleri serbest bırak.</small></div>
    <div class="modes">
      <button class="mode on" data-m="sim"><b>🏘️ Simülasyon Modu</b><small>Yüzlerce küçük insan; tanrı gibi izle, dünyayı şekillendir, felaketleri serbest bırak.</small></button>
      <button class="mode" data-m="detail"><b>🧑‍🌾 Detaylı Mod</b><small>Tek insanla başla: isimler, özellikler, beceri ağacı, çiftlik, okul, fabrika ve olaylar.</small></button>
      <button class="mode" data-m="cozy"><b>🏝️ Ada Modu</b><small>Kendi adanda huzurlu bir hayat: balık tut, böcek yakala, çiçek ek, komşularınla tanış. Birinci/üçüncü şahıs ve izometrik kamera.</small></button>
    </div>
    <div class="mbtns"><button class="mbtn play" id="mPlay">▶ Oyna</button><button class="mbtn" id="mNew">🌍 Yeni Dünya</button><button class="mbtn" id="mSaves">💾 Kayıtlar</button></div>
  </div>
  <div id="gfx" class="glass">
    <h4>Grafikler:</h4>
    <div class="gq" id="gQ"><button data-q="uplus">Ultra+</button><button data-q="ultra">Ultra</button><button data-q="high">Yüksek</button><button data-q="mid">Orta</button><button data-q="low">Düşük</button></div>
    <div id="gdesc"></div>
    <label class="sw"><span>🔊 Ses ve ortam</span><input type="checkbox" id="mSnd"><i></i></label>
    <label class="sw" style="margin-top:8px;padding-top:8px"><span>🎵 Müzik</span><input type="checkbox" id="mMus"><i></i></label>
    <label class="sw"><span>Low-Poly grafikleri</span><input type="checkbox" id="mLow"><i></i></label>
    <div class="shint">Açıkken eski düz yüzeyli maket görünümü gelir.</div>
  </div>
</div>
<div id="toast"></div><div id="flash"></div>
<div id="loading"><b>🌍 Mini Dünya</b><div>Dünya yükleniyor…</div></div>
<div id="err"></div>
<script>
addEventListener('error',function(e){var x=document.getElementById('err');x.style.display='block';x.textContent='Hata: '+(e.message||e.error)+(e.lineno?' (satır '+e.lineno+')':'');});
addEventListener('unhandledrejection',function(e){var x=document.getElementById('err');x.style.display='block';x.textContent='Hata: '+(e.reason&&e.reason.message||e.reason);});
setTimeout(function(){if(!window.__started){var l=document.getElementById('loading');l.innerHTML='<b>Yüklenemedi</b><div>Three.js indirilemedi ya da tarayıcı WebGL2 desteklemiyor. Bağlantını kontrol edip sayfayı yenile.</div>';}},12000);
</script>
<script type="module">
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
${sim}
${detailLogic}
${main}
</script>
</body></html>`;
fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync('dist/index.html', html);
fs.writeFileSync('dist/game.mjs', `import * as THREE from 'three';\nimport { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';\n${sim}\n${detailLogic}\n${main}\n`);
console.log('built', (html.length / 1024).toFixed(0) + ' KB');
