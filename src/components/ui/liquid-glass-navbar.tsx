"use client"

/**
 * Nimbus UI · Liquid Navbar — "Waterline" (TabiGuide Japanese Craft Edition)
 * A pill of water. The active drop stretches toward the item you pick, splits into
 * droplets on long jumps and merges back with a ripple. The cursor lifts a meniscus,
 * every tap sends a wave along the pill, and each icon plays its own little scene.
 * Supports full WebGL shader rendering for primary navigation plus a zero-context
 * synchronized spring liquid renderer (`LiquidTabs`) so sub-navs, script switches,
 * and biome/filter controls everywhere in the app share the liquid transition.
 */

import * as React from "react"
import type { JapaneseThemeId } from "../../data/japanData"
import { getJapaneseLiquidPalette } from "../../utils/liquidNavTheme"

export type NimbusFx = "plane" | "drop" | "spin" | "glow" | "wave" | "pop" | "none"

export type LiquidNavItem = {
  id?: string
  label: string
  href?: string
  icon?: React.ReactNode
  /** the little scene the icon plays when tapped */
  fx?: NimbusFx
}

export type LiquidNavbarProps = {
  items?: LiquidNavItem[]
  defaultActive?: number
  active?: number
  onChange?: (index: number, item: LiquidNavItem) => void
  /** "light" water for bright backgrounds, "dark" for dark ones */
  tone?: "light" | "dark"
  /** active TabiGuide Japanese aesthetic theme */
  themeId?: JapaneseThemeId
  /** icons only */
  compact?: boolean
  /** hide pill below 768px when a mobile navigation drawer is active */
  hideOnMobile?: boolean
  /** collapse labels to compact icons below 1080px with hover tooltips */
  responsiveCollapse?: boolean
  /** vertical placement of hover label tooltip when icons-only */
  tooltipPlacement?: "top" | "bottom"
  /** visual size scale */
  size?: "xs" | "sm" | "md"
  /** "webgl" for primary nav shader; "spring" for lightweight multi-bar liquid tabs */
  renderer?: "webgl" | "spring"
  /** ARIA semantic role mode */
  semanticRole?: "nav" | "group"
  /** soft synthesized "plip" on tap (no audio files) */
  sound?: boolean
  ariaLabel?: string
  className?: string
  style?: React.CSSProperties
}

/* ---------- icons ---------- */
const I = (d: React.ReactNode) => (
  <svg
    viewBox="0 0 24 24"
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {d}
  </svg>
)

export const NimbusIcons = {
  home: I(
    <>
      <path d="M3.5 11.2 12 4l8.5 7.2" />
      <path d="M6 9.6V20h12V9.6" />
      <path className="nv-door" d="M10 20v-5h4v5Z" />
    </>
  ),
  globe: I(
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.6 2.4 2.6 14.6 0 17M12 3.5c-2.6 2.4-2.6 14.6 0 17" />
    </>
  ),
  plane: I(<path d="M21 12.2 3.6 5.4l2.7 6.8-2.7 6.4L21 12.2Zm-14.7 0H13" />),
  drop: I(<path d="M12 3.5s6 6.4 6 10.6a6 6 0 0 1-12 0C6 9.9 12 3.5 12 3.5Z" />),
  user: I(
    <>
      <circle cx="12" cy="8.5" r="3.8" />
      <path d="M4.8 20c1.2-3.4 4-5 7.2-5s6 1.6 7.2 5" />
    </>
  ),
}

export const JapaneseNavIcons = {
  /** Wayfinder compass for Explore */
  compass: I(
    <>
      <circle cx="12" cy="12" r="8.5" />
      <polygon className="nv-door" points="15.2 8.8 13.4 13.4 8.8 15.2 10.6 10.6 15.2 8.8" />
    </>
  ),
  /** Minimalist Torii gate silhouette for 3D Shrine */
  torii: I(
    <>
      <path d="M3.5 6.5c5.2 1.2 11.8 1.2 17 0" />
      <path d="M5.5 10.2h13" />
      <path d="M7.5 7.2V20" />
      <path d="M16.5 7.2V20" />
      <rect className="nv-door" x="10.4" y="6.8" width="3.2" height="3.4" rx="0.5" />
    </>
  ),
  /** Japanese calligraphy / kanji tablet for Learn */
  kanji: I(
    <>
      <rect x="4.5" y="4.5" width="15" height="15" rx="3" />
      <path d="M8.5 9.2h7" />
      <path d="M12 7.5v8.2" />
      <path d="M8.8 14.8c1.9-1.2 4.5-1.2 6.4 0" />
    </>
  ),
  /** Shinkansen nose + route rail for Itinerary */
  shinkansen: I(
    <>
      <path d="M3.5 15.5h13.8c2.1 0 3.7-.9 3.7-2.2 0-1.9-2.8-4.5-6.8-4.5H5.5a2 2 0 0 0-2 2v4.7Z" />
      <path d="M12.5 9v3.6h5.8" />
      <path d="M3 19h18" />
    </>
  ),
  /** Japanese Yen crest for Budget */
  yen: I(
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.2 7.8 12 11.8l2.8-4" />
      <path d="M12 11.8v5.4" />
      <path d="M9.2 12.6h5.6" />
      <path d="M9.5 15h5" />
    </>
  ),
  /** Omamori protective charm for Safety & Vault */
  omamori: I(
    <>
      <path d="M8.2 4.5h7.6l2.2 3.2v10.8a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 18.5V7.7l2.2-3.2Z" />
      <path d="M9.2 8.2h5.6" />
      <circle className="nv-door" cx="12" cy="14" r="2.2" />
    </>
  ),
  /** Chochin paper lantern for Support */
  chochin: I(
    <>
      <path d="M9.5 4.2h5" />
      <rect className="nv-door" x="7" y="6.2" width="10" height="11.4" rx="4.5" />
      <path d="M7.3 10h9.4M7.3 13.8h9.4" />
      <path d="M9.8 17.6h4.4" />
      <path d="M12 17.6v2.6" />
    </>
  ),
}

const DEFAULT_ITEMS: LiquidNavItem[] = [
  { label: "Explore", icon: JapaneseNavIcons.compass, fx: "spin" },
  { label: "3D Shrine", icon: JapaneseNavIcons.torii, fx: "glow" },
  { label: "Learn", icon: JapaneseNavIcons.kanji, fx: "pop" },
  { label: "Itinerary", icon: JapaneseNavIcons.shinkansen, fx: "plane" },
  { label: "Budget", icon: JapaneseNavIcons.yen, fx: "pop" },
  { label: "Safety & Vault", icon: JapaneseNavIcons.omamori, fx: "wave" },
  { label: "Support", icon: JapaneseNavIcons.chochin, fx: "drop" },
]

const PAD = 14 // canvas bleed around the pill, for shadows and ripples

/* ---------- styles ---------- */
const NIMBUS_CSS = `
.nimbus-nav{
  --n-tint:rgba(255,250,242,.62);
  --n-fg:var(--text-primary,#1E1B16);
  --n-fg-soft:var(--text-secondary,#52493D);
  --n-rim:rgba(255,255,255,.82);
  --n-border:var(--glass-border,rgba(120,88,42,.22));
  --n-accent:var(--accent,#A67108);
  --n-accent-soft:var(--accent-soft,rgba(166,113,8,.14));
  --n-shadow:rgba(68,46,18,.18);
  position:relative;display:inline-flex;align-items:center;gap:2px;padding:4px;border-radius:999px;isolation:isolate;
  font-family:var(--font-sans,"Plus Jakarta Sans",ui-sans-serif,system-ui,sans-serif);
  -webkit-font-smoothing:antialiased;user-select:none;-webkit-tap-highlight-color:transparent
}
.nimbus-nav[data-tone="dark"]{
  --n-tint:rgba(17,19,26,.62);
  --n-fg:var(--text-primary,#F6F2EA);
  --n-fg-soft:var(--text-secondary,#B6AEA0);
  --n-rim:rgba(255,246,220,.24);
  --n-border:var(--glass-border,rgba(246,201,69,.22));
  --n-accent:var(--accent,#F6C945);
  --n-accent-soft:var(--accent-soft,rgba(246,201,69,.16));
  --n-shadow:rgba(0,0,0,.5)
}
.nimbus-glass{
  position:absolute;inset:0;border-radius:inherit;z-index:-2;overflow:hidden;
  background:var(--n-tint);
  -webkit-backdrop-filter:blur(12px) saturate(1.25) brightness(1.04);
  backdrop-filter:blur(12px) saturate(1.25) brightness(1.04);
  box-shadow:inset 0 1px 1px var(--n-rim),inset 0 0 0 1px var(--n-border),0 10px 26px -14px var(--n-shadow),0 2px 6px rgba(0,0,0,.08)
}
.nimbus-nav[data-refract="on"][data-gl="on"] .nimbus-glass{
  -webkit-backdrop-filter:url(#nimbus-refract-shared) blur(3px) saturate(1.2) brightness(1.04);
  backdrop-filter:url(#nimbus-refract-shared) blur(3px) saturate(1.2) brightness(1.04)
}
.nimbus-water{position:absolute;left:${-PAD}px;top:${-PAD}px;z-index:-1;pointer-events:none}
.nimbus-nav[data-gl="off"] .nimbus-water{display:none}
.nimbus-drop{
  display:none;position:absolute;top:4px;bottom:4px;left:0;border-radius:999px;z-index:-1;pointer-events:none;
  will-change:transform,width;
  background:
    radial-gradient(125% 130% at 32% 8%,rgba(255,255,255,.58),rgba(255,255,255,0) 56%),
    linear-gradient(180deg,var(--n-accent-soft),color-mix(in srgb,var(--n-accent-soft) 72%,rgba(255,255,255,.25)));
  box-shadow:
    inset 0 1px 1.5px var(--n-rim),
    inset 0 -2px 6px var(--n-accent-soft),
    inset 0 0 0 1px color-mix(in srgb,var(--n-accent) 42%,var(--n-border)),
    0 4px 12px -4px var(--n-shadow)
}
.nimbus-nav[data-tone="dark"] .nimbus-drop{
  background:
    radial-gradient(125% 130% at 32% 8%,rgba(255,255,255,.24),rgba(255,255,255,0) 56%),
    linear-gradient(180deg,color-mix(in srgb,var(--n-accent-soft) 115%,rgba(255,255,255,.06)),var(--n-accent-soft));
}
.nimbus-nav[data-gl="off"] .nimbus-drop{display:block}
.nimbus-item{
  position:relative;z-index:1;display:inline-flex;align-items:center;gap:6px;height:36px;padding:0 11px;
  border:0;border-radius:999px;background:none;color:var(--n-fg-soft);
  font-family:inherit;font-weight:550;font-size:13px;line-height:1;letter-spacing:-.01em;
  text-decoration:none;white-space:nowrap;flex-shrink:0;cursor:pointer;transition:color .25s ease
}
.nimbus-nav[data-size="sm"]{padding:3px}
.nimbus-nav[data-size="sm"] .nimbus-drop{top:3px;bottom:3px}
.nimbus-nav[data-size="sm"] .nimbus-item{height:30px;padding:0 11px;gap:5px;font-size:12px}
.nimbus-nav[data-size="xs"]{padding:3px}
.nimbus-nav[data-size="xs"] .nimbus-drop{top:3px;bottom:3px}
.nimbus-nav[data-size="xs"] .nimbus-item{height:26px;padding:0 9px;gap:4px;font-size:11.5px}
.nimbus-item:hover,.nimbus-item[aria-current="page"],.nimbus-item[aria-pressed="true"]{color:var(--n-fg)}
.nimbus-item[aria-current="page"],.nimbus-item[aria-pressed="true"]{font-weight:650}
.nimbus-item[aria-current="page"] .nv-ico,.nimbus-item[aria-pressed="true"] .nv-ico{color:var(--n-accent)}
.nimbus-item:focus-visible{outline:2px solid var(--n-accent);outline-offset:2px}
.nv-ico{position:relative;display:inline-flex;flex:none;transition:color .25s ease}
.nv-ico svg{transition:transform .45s cubic-bezier(.3,1.6,.5,1)}
.nimbus-item[aria-current="page"] .nv-ico svg,
.nimbus-item[aria-pressed="true"] .nv-ico svg{transform:translateY(-1px) scale(1.06)}
.nv-door{fill:transparent}
.nv-ico[data-fx="pop"] svg{animation:nvPop .5s cubic-bezier(.3,1.6,.5,1) both}
@keyframes nvPop{0%{transform:scale(.74)}60%{transform:scale(1.18)}100%{transform:translateY(-1px) scale(1.06)}}
.nv-ico[data-fx="plane"] svg{animation:nvPlane 1.1s cubic-bezier(.55,0,.3,1) both}
@keyframes nvPlane{
  0%{transform:none}
  12%{transform:translate(-2px,1px) rotate(4deg)}
  42%{transform:translate(48px,-12px) rotate(-12deg) scale(.92);opacity:0}
  43%{transform:translate(-44px,8px) rotate(-6deg) scale(.92);opacity:0}
  58%{opacity:1}
  80%{transform:translate(2px,-1px) rotate(1deg)}
  100%{transform:translateY(-1px) scale(1.06)}
}
.nv-ico[data-fx="plane"]::after{
  content:"";position:absolute;left:55%;top:50%;height:1.5px;width:36px;border-radius:2px;transform-origin:0 50%;
  background:linear-gradient(90deg,transparent,var(--n-accent));animation:nvTrail 1.1s ease-out both;pointer-events:none
}
@keyframes nvTrail{
  0%,8%{opacity:0;transform:rotate(-12deg) scaleX(0)}
  30%{opacity:.85;transform:rotate(-12deg) scaleX(1)}
  55%,100%{opacity:0;transform:rotate(-12deg) translateX(24px) scaleX(.2)}
}
.nv-ico[data-fx="drop"] svg{animation:nvDrop .9s cubic-bezier(.4,0,.3,1) both;transform-origin:50% 100%}
@keyframes nvDrop{
  0%{transform:translateY(-1px)}
  26%{transform:translateY(-10px) scale(.9,1.1)}
  46%{transform:translateY(2px) scale(1.22,.74)}
  62%{transform:translateY(-2px) scale(.94,1.06)}
  80%{transform:translateY(0) scale(1.03,.98)}
  100%{transform:translateY(-1px) scale(1.06)}
}
.nv-ico[data-fx="drop"]::before,.nv-ico[data-fx="drop"]::after{
  content:"";position:absolute;bottom:0;left:50%;width:3.5px;height:3.5px;margin-left:-1.75px;border-radius:50%;
  background:var(--n-accent);opacity:0;pointer-events:none
}
.nv-ico[data-fx="drop"]::before{animation:nvSplashL .9s ease-out both}
.nv-ico[data-fx="drop"]::after{animation:nvSplashR .9s ease-out both}
@keyframes nvSplashL{0%,44%{opacity:0;transform:none}50%{opacity:.9;transform:translate(-5px,-6px)}75%,100%{opacity:0;transform:translate(-10px,1px) scale(.4)}}
@keyframes nvSplashR{0%,44%{opacity:0;transform:none}50%{opacity:.9;transform:translate(5px,-7px)}75%,100%{opacity:0;transform:translate(10px,1px) scale(.4)}}
.nv-ico[data-fx="spin"] svg{animation:nvSpin .95s cubic-bezier(.2,.75,.25,1) both}
@keyframes nvSpin{0%{transform:perspective(80px) rotateY(0)}100%{transform:perspective(80px) rotateY(360deg) translateY(-1px) scale(1.06)}}
.nv-ico[data-fx="glow"] svg{animation:nvHop .8s cubic-bezier(.3,1.4,.5,1) both;transform-origin:50% 100%}
@keyframes nvHop{
  0%{transform:none}
  30%{transform:translateY(-4px) scale(1.04,.96)}
  55%{transform:translateY(0) scale(1.1,.9)}
  75%{transform:translateY(-2px) scale(.98,1.03)}
  100%{transform:translateY(-1px) scale(1.06)}
}
.nv-ico[data-fx="glow"] .nv-door{animation:nvDoor 1.25s ease both}
@keyframes nvDoor{0%{fill:transparent}35%{fill:#FDE68A}100%{fill:var(--n-accent-soft)}}
.nv-ico[data-fx="wave"] svg{animation:nvWave .9s ease-in-out both;transform-origin:50% 92%}
@keyframes nvWave{
  0%{transform:none}
  20%{transform:rotate(-13deg)}
  40%{transform:rotate(10deg)}
  60%{transform:rotate(-7deg)}
  80%{transform:rotate(4deg)}
  100%{transform:translateY(-1px) scale(1.06)}
}
.nimbus-nav[data-compact="true"] .nimbus-item{padding:0 11px}
.nimbus-nav[data-compact="true"] .nimbus-label{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.nimbus-tip{
  display:none;position:absolute;left:50%;padding:5px 10px;border-radius:10px;
  font-size:11.5px;font-weight:600;line-height:1.1;letter-spacing:.01em;white-space:nowrap;
  color:var(--n-fg);background:rgba(255,252,245,.94);border:1px solid var(--n-border);
  box-shadow:0 8px 20px -6px rgba(68,46,18,.22);
  -webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);
  opacity:0;pointer-events:none;z-index:25;
  transition:opacity .16s ease,transform .18s cubic-bezier(.2,.8,.2,1)
}
.nimbus-nav[data-tone="dark"] .nimbus-tip{
  background:rgba(17,19,26,.94);
  box-shadow:0 10px 24px -6px rgba(0,0,0,.6)
}
.nimbus-nav[data-tip="top"] .nimbus-tip{bottom:calc(100% + 10px);transform:translateX(-50%) translateY(4px)}
.nimbus-nav[data-tip="bottom"] .nimbus-tip{top:calc(100% + 10px);transform:translateX(-50%) translateY(-4px)}
.nimbus-nav[data-compact="true"] .nimbus-tip{display:inline-flex;align-items:center}
.nimbus-nav[data-compact="true"] .nimbus-item:hover .nimbus-tip,
.nimbus-nav[data-compact="true"] .nimbus-item:focus-visible .nimbus-tip{opacity:1;transform:translateX(-50%) translateY(0)}
@media (max-width:1080px){
  .nimbus-nav[data-responsive-collapse="true"] .nimbus-item{padding:0 11px}
  .nimbus-nav[data-responsive-collapse="true"] .nimbus-label{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
  .nimbus-nav[data-responsive-collapse="true"] .nimbus-tip{display:inline-flex;align-items:center}
  .nimbus-nav[data-responsive-collapse="true"] .nimbus-item:hover .nimbus-tip,
  .nimbus-nav[data-responsive-collapse="true"] .nimbus-item:focus-visible .nimbus-tip{opacity:1;transform:translateX(-50%) translateY(0)}
}
@media (max-width:767px){
  .nimbus-nav[data-mobile-hidden="true"]{display:none}
}
@media (max-width:380px){
  .nimbus-nav[data-compact="true"] .nimbus-item{padding:0 9px}
}
@media (prefers-reduced-motion:reduce){
  .nv-ico svg,.nv-ico::before,.nv-ico::after,.nv-door,.nimbus-tip{animation:none!important;transition:none}
}
`

/* ---------- the water shader ---------- */
const VERT = `attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}`
const FRAG = `precision highp float;
uniform vec2 uRes;uniform float uDpr;uniform float uTime;uniform vec4 uPill;
uniform vec4 uBlob[6];uniform float uSy[6];uniform vec4 uRip[6];uniform vec3 uMouse;
uniform float uDark;uniform float uAmb;uniform vec3 uAccent;uniform vec3 uRim;
float sdRB(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return length(max(q,0.))+min(max(q.x,q.y),0.)-r;}
float sdCap(vec2 p,vec4 B,float sy){p-=B.xy;p.y/=sy;p.x=max(abs(p.x)-B.z,0.);return(length(p)-B.w)*min(1.,sy);}
float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
float dropD(vec2 p){float d=1e4;for(int i=0;i<6;i++){if(uBlob[i].w>.5){d=smin(d,sdCap(p,uBlob[i],uSy[i]),13.);}}return d;}
float pillD(vec2 p){vec2 h=uPill.zw*.5;return sdRB(p-uPill.xy-h,h,h.y);}
float lens(float d,float w){float t=clamp(-d/w,0.,1.);return sqrt(1.-(1.-t)*(1.-t));}
float waves(vec2 p){float w=0.;
 for(int i=0;i<6;i++){vec4 R=uRip[i];if(R.w>0.){float x=length(p-R.xy)-R.z*240.;w+=R.w*exp(-R.z*1.7)*sin(x*.3)*exp(-x*x/700.);}}
 vec2 m=p-uMouse.xy;w+=uMouse.z*3.6*exp(-dot(m,m)/1000.);
 w+=uAmb*(sin(p.x*.05+uTime*1.2)*.45+sin(p.x*.13-uTime*.85+p.y*.2)*.25);return w;}
float H(vec2 p){float dp=pillD(p);return lens(dp,uPill.w*.36)*2.4+lens(dropD(p),11.)*7.5+waves(p)*smoothstep(0.,7.,-dp);}
float caus(vec2 p,float t){vec2 q=p;float c=0.;for(int i=0;i<3;i++){q+=vec2(sin(q.y*1.1+t),cos(q.x*1.3-t*.7))*.6;c+=1./(1.+16.*abs(sin(q.x)*sin(q.y)));}return c/3.;}
void main(){
 vec2 p=vec2(gl_FragCoord.x,uRes.y*uDpr-gl_FragCoord.y)/uDpr;
 float dp=pillD(p);float dd=dropD(p);
 float h0=H(p);vec3 n=normalize(vec3(h0-H(p+vec2(1.,0.)),h0-H(p+vec2(0.,1.)),1.));
 vec3 V=vec3(0.,0.,1.);
 float spec=pow(max(dot(reflect(-normalize(vec3(-.45,-.8,.85)),n),V),0.),70.);
 float spec2=pow(max(dot(reflect(-normalize(vec3(.6,.75,.7)),n),V),0.),22.)*.3;
 float fres=clamp((1.-n.z)*4.,0.,1.);
 vec3 irid=mix(.5+.5*cos(6.2831*(vec3(0.,.33,.67)+fres*.85+p.x*.0028+uTime*.035)),uRim,.42);
 float pm=smoothstep(1.,-1.,dp);float dm=smoothstep(1.,-1.,dd)*smoothstep(1.,-2.,dp);
 float sh=smoothstep(9.,-9.,dropD(p-vec2(0.,5.)))*(1.-dm)*pm*(.11+.07*uDark);
 vec3 c=mix(uAccent*.35,uAccent*.18,uDark)*sh;float a=sh;
 float pa=clamp(pm*(fres*.46+spec*.88+spec2),0.,1.);
 c=mix(vec3(1.),irid,.5*fres)*pa+c*(1.-pa);a=pa+a*(1.-pa);
 float th=lens(dd,11.);
 float cs=caus((p+n.xy*th*18.)*.085,uTime*.9);
 vec3 lightBody=mix(vec3(.97,.95,.90),uAccent,.24);
 vec3 darkBody=mix(vec3(.14,.16,.21),uAccent,.36);
 vec3 tint=mix(lightBody,darkBody,uDark);
 float rim=dm*(1.-smoothstep(0.,8.,-dd));
 float cres=dm*smoothstep(.12,.55,dot(n.xy,normalize(vec2(.55,.85))))*smoothstep(0.,3.,-dd);
 float body=.5+.5*clamp(-n.y*3.,-1.,1.);
 float da=dm*(.28+.15*body)*(1.-.28*uDark);vec3 dc=mix(tint,vec3(1.),body*.45);
 float la=rim*.26;vec3 lc=mix(uAccent,uRim,uDark);dc=lc*la+dc*da*(1.-la);da=la+da*(1.-la);
 la=clamp(cres*.65+smoothstep(.6,1.,cs)*.26*th*dm,0.,1.);dc=mix(vec3(1.),uRim,.32)*la+dc*(1.-la);da=la+da*(1.-la);
 la=clamp(dm*(spec*1.15+spec2*.48),0.,1.);dc=vec3(1.)*la+dc*(1.-la);da=la+da*(1.-la);
 la=dm*smoothstep(-2.,0.,dd)*.38;dc=mix(vec3(1.),irid,.4)*la+dc*(1.-la);da=la+da*(1.-la);
 c=dc+c*(1.-da);a=da+a*(1.-da);
 gl_FragColor=vec4(c,a);
}`

type Body = { x: number; v: number }
type Sat = { x: number; y: number; vx: number; vy: number; r: number; k: number }
type Rip = { x: number; y: number; age: number; amp: number }

function makeState() {
  return {
    a: { x: 0, v: 0 } as Body,
    b: { x: 0, v: 0 } as Body,
    sy: { s: 1, v: 0 },
    lead: 0 as 0 | 1,
    lagFrom: 0,
    sats: [] as Sat[],
    rips: [] as Rip[],
    t: { x: 0, cy: 0, q: 0, r: 18 },
    q: 0,
    mouse: { x: 0, y: 0, s: 0, on: false },
    moving: false,
    split: false,
    ready: false,
    w: 0,
    h: 0,
    pad: PAD,
    visible: true,
    reduce: false,
    raf: 0,
    last: 0,
    time: 0,
    glc: null as null | { gl: WebGLRenderingContext; u: Record<string, WebGLUniformLocation | null> },
  }
}

function initGL(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false }) as WebGLRenderingContext | null
  if (!gl) return null
  const sh = (type: number, src: string) => {
    const s = gl.createShader(type)
    if (!s) return null
    gl.shaderSource(s, src)
    gl.compileShader(s)
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null
  }
  const vs = sh(gl.VERTEX_SHADER, VERT)
  const fs = sh(gl.FRAGMENT_SHADER, FRAG)
  if (!vs || !fs) return null
  const p = gl.createProgram()
  if (!p) return null
  gl.attachShader(p, vs)
  gl.attachShader(p, fs)
  gl.linkProgram(p)
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) return null
  gl.useProgram(p)
  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  const loc = gl.getAttribLocation(p, "a")
  gl.enableVertexAttribArray(loc)
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
  const u: Record<string, WebGLUniformLocation | null> = {}
  for (const n of [
    "uRes",
    "uDpr",
    "uTime",
    "uPill",
    "uBlob",
    "uSy",
    "uRip",
    "uMouse",
    "uDark",
    "uAmb",
    "uAccent",
    "uRim",
  ]) {
    u[n] = gl.getUniformLocation(p, n)
  }
  return { gl, u }
}

function supportsRefraction() {
  if (typeof window === "undefined" || typeof CSS === "undefined") return false
  const ua = navigator.userAgent
  return /Chrome\/|Chromium\/|Edg\//.test(ua) && !/Firefox\//.test(ua) && !!(CSS as unknown as { supports?: (p: string, v: string) => boolean }).supports?.("backdrop-filter", "url(#a)")
}

/** Synced reactive dark-mode observer so nested LiquidTabs match <html class="dark"> automatically */
function useDocumentDarkMode(explicitTone?: "light" | "dark"): "light" | "dark" {
  const [docDark, setDocDark] = React.useState<boolean>(() => {
    if (typeof document === "undefined") return true
    return document.documentElement.classList.contains("dark")
  })

  React.useEffect(() => {
    if (explicitTone || typeof document === "undefined") return
    const check = () => setDocDark(document.documentElement.classList.contains("dark"))
    check()
    const mo = new MutationObserver(check)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    return () => mo.disconnect()
  }, [explicitTone])

  if (explicitTone) return explicitTone
  return docDark ? "dark" : "light"
}

function ensureNimbusAssets() {
  if (typeof document === "undefined") return
  if (!document.getElementById("nimbus-waterline-css")) {
    const style = document.createElement("style")
    style.id = "nimbus-waterline-css"
    style.textContent = NIMBUS_CSS
    document.head.appendChild(style)
  }
  if (!document.getElementById("nimbus-refract-shared")) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
    svg.setAttribute("width", "0")
    svg.setAttribute("height", "0")
    svg.setAttribute("aria-hidden", "true")
    svg.style.position = "absolute"
    svg.style.pointerEvents = "none"
    svg.innerHTML =
      '<filter id="nimbus-refract-shared" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">' +
      '<feTurbulence type="fractalNoise" baseFrequency="0.006 0.02" numOctaves="2" seed="7" result="noise" />' +
      '<feGaussianBlur in="noise" stdDeviation="2" result="soft" />' +
      '<feDisplacementMap in="SourceGraphic" in2="soft" scale="60" xChannelSelector="R" yChannelSelector="G" />' +
      "</filter>"
    document.body.appendChild(svg)
  }
}

export function LiquidNavbar({
  items = DEFAULT_ITEMS,
  defaultActive = 0,
  active,
  onChange,
  tone,
  themeId = "kinpaku",
  compact,
  hideOnMobile = false,
  responsiveCollapse = false,
  tooltipPlacement = "bottom",
  size = "md",
  renderer = "webgl",
  semanticRole = "nav",
  sound = false,
  ariaLabel = "Primary Navigation",
  className,
  style,
}: LiquidNavbarProps) {
  const [inner, setInner] = React.useState(defaultActive)
  const current = Math.max(0, Math.min(items.length - 1, active ?? inner))
  const resolvedTone = useDocumentDarkMode(tone)
  const navRef = React.useRef<HTMLElement>(null)
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const dropRef = React.useRef<HTMLSpanElement>(null)
  const itemRefs = React.useRef<(HTMLElement | null)[]>([])
  const iconRefs = React.useRef<(HTMLSpanElement | null)[]>([])
  const audio = React.useRef<AudioContext | null>(null)
  const st = React.useRef(makeState())
  const [gl, setGl] = React.useState<"on" | "off">(renderer === "webgl" ? "on" : "off")
  const [refract, setRefract] = React.useState(false)
  const [fx, setFx] = React.useState({ i: -1, n: 0 })

  const useWebGL = renderer === "webgl"
  st.current.pad = useWebGL ? PAD : 0

  const dark = resolvedTone === "dark" ? 1 : 0
  const darkRef = React.useRef(dark)
  darkRef.current = dark

  const palette = getJapaneseLiquidPalette(themeId, resolvedTone === "dark")
  const paletteRef = React.useRef(palette)
  paletteRef.current = palette

  /* ---- drawing ---- */
  const draw = React.useCallback(() => {
    const s = st.current
    const T = s.t
    const sep = Math.abs(s.a.x - s.b.x)
    const thin = Math.min(sep / (2 * (s.q + T.r) || 1), 1)
    const r = T.r * (1 - 0.3 * thin)
    if (s.glc) {
      const { gl: g, u } = s.glc
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      g.viewport(0, 0, g.drawingBufferWidth, g.drawingBufferHeight)
      g.uniform2f(u.uRes, s.w + PAD * 2, s.h + PAD * 2)
      g.uniform1f(u.uDpr, dpr)
      g.uniform1f(u.uTime, s.time)
      g.uniform4f(u.uPill, PAD, PAD, s.w, s.h)
      const blobs = new Float32Array(24)
      const sy = new Float32Array(6).fill(1)
      const head = s.lead === 0 ? s.a : s.b
      const tail = s.lead === 0 ? s.b : s.a
      blobs.set(
        [
          head.x,
          T.cy,
          s.q * (1 - 0.25 * thin),
          T.r * (1 - 0.12 * thin),
          tail.x,
          T.cy,
          s.q * (1 - 0.8 * thin),
          T.r * (1 - 0.5 * thin),
        ],
        0
      )
      sy[0] = sy[1] = s.sy.s
      s.sats.slice(0, 4).forEach((d, i) => blobs.set([d.x, d.y, 0, d.r], 8 + i * 4))
      g.uniform4fv(u.uBlob, blobs)
      g.uniform1fv(u.uSy, sy)
      const rips = new Float32Array(24)
      s.rips.slice(-6).forEach((p, i) => rips.set([p.x, p.y, p.age, p.amp], i * 4))
      g.uniform4fv(u.uRip, rips)
      g.uniform3f(u.uMouse, s.mouse.x, s.mouse.y, s.mouse.s)
      g.uniform1f(u.uDark, darkRef.current)
      g.uniform1f(u.uAmb, s.reduce ? 0 : 1)
      const [ar, ag, ab] = paletteRef.current.waterRgb
      const [rr, rg, rb] = paletteRef.current.rimRgb
      g.uniform3f(u.uAccent, ar, ag, ab)
      g.uniform3f(u.uRim, rr, rg, rb)
      g.clearColor(0, 0, 0, 0)
      g.clear(g.COLOR_BUFFER_BIT)
      g.drawArrays(g.TRIANGLES, 0, 3)
    } else if (dropRef.current) {
      const left = Math.min(s.a.x, s.b.x) - s.q - r - s.pad
      const width = sep + 2 * (s.q + r)
      dropRef.current.style.width = `${Math.max(0, width)}px`
      dropRef.current.style.transform = `translateX(${left}px) scaleY(${s.sy.s})`
    }
  }, [])

  /* ---- physics ---- */
  const step = React.useCallback((dt: number, now: number) => {
    const s = st.current
    const T = s.t
    const pad = s.pad
    s.time += dt
    s.q += (T.q - s.q) * Math.min(1, dt * 12)
    const bodies = [s.a, s.b]
    let still = true
    if (s.reduce) {
      s.a.x = s.b.x = T.x
      s.a.v = s.b.v = 0
      s.sy.s = 1
      s.sats = []
    } else {
      bodies.forEach((B, i) => {
        const lead = i === s.lead
        const k = lead ? 210 : 72
        const c = lead ? 25 : 13
        const f = !lead && now < s.lagFrom ? 0.08 : 1
        B.v += (k * (T.x - B.x) - c * B.v) * dt * f
        B.x += B.v * dt
        const lo = pad + 4 + s.q + T.r - 3
        const hi = Math.max(lo, pad + s.w - 4 - s.q - T.r + 3)
        if (B.x < lo || B.x > hi) {
          s.sy.v -= Math.min(Math.abs(B.v), 900) * 0.0016
          B.x = Math.max(lo, Math.min(hi, B.x))
          B.v *= -0.25
        }
        if (Math.abs(T.x - B.x) > 0.3 || Math.abs(B.v) > 3) still = false
      })
      const L = bodies[s.lead]
      const syT = 1 - 0.2 * Math.min(Math.abs(L.v) / 1500, 1)
      s.sy.v += (280 * (syT - s.sy.s) - 9 * s.sy.v) * dt
      s.sy.s += s.sy.v * dt
      if (Math.abs(s.sy.s - 1) > 0.002 || Math.abs(s.sy.v) > 0.02) still = false
      if (s.glc) {
        const sep = Math.abs(s.a.x - s.b.x)
        const r = T.r * (1 - 0.3 * Math.min(sep / (2 * (T.q + T.r) || 1), 1))
        if (!s.split && s.moving && sep - 2 * T.q - 2 * r > -6) {
          s.split = true
          const lo = bodies[1 - s.lead]
          const hi = bodies[s.lead]
          ;[0.3, 0.5, 0.72].forEach((t, j) => {
            s.sats.push({
              x: lo.x + (hi.x - lo.x) * t + (Math.random() - 0.5) * 6,
              y: T.cy + (Math.random() - 0.5) * 8,
              vx: (lo.v + hi.v) * 0.45,
              vy: (Math.random() - 0.5) * 55,
              r: 4.5 + Math.random() * 2.5 - j * 0.5,
              k: 70 + Math.random() * 90,
            })
          })
        }
        s.sats = s.sats.filter((d) => {
          d.vx += (d.k * (T.x - d.x) - 9 * d.vx) * dt
          d.vy += (90 * (T.cy - d.y) - 7 * d.vy) * dt
          d.x += d.vx * dt
          d.y += d.vy * dt
          d.x = Math.max(pad + 6 + d.r, Math.min(pad + s.w - 6 - d.r, d.x))
          d.y = Math.max(T.cy - T.r + d.r, Math.min(T.cy + T.r - d.r, d.y))
          if (Math.abs(T.x - d.x) < T.q + T.r * 0.5) d.r -= dt * 26
          return d.r > 0.6
        })
        if (s.sats.length) still = false
      }
    }
    if (s.moving && still) {
      s.moving = false
      if (s.glc && (s.split || !s.reduce)) {
        s.rips.push({ x: T.x, y: T.cy, age: 0, amp: s.split ? 1.1 : 0.7 })
      }
    }
    s.rips.forEach((p) => (p.age += dt))
    s.rips = s.rips.filter((p) => p.age < 2.4)
    const target = s.mouse.on ? 1 : 0
    s.mouse.s += (target - s.mouse.s) * Math.min(1, dt * 7)
  }, [])

  const loop = React.useCallback(() => {
    const s = st.current
    if (s.raf) return
    s.last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min((now - s.last) / 1000, 1 / 30)
      s.last = now
      step(dt, now)
      draw()
      const busy =
        s.moving ||
        Math.abs(s.a.x - s.t.x) > 0.4 ||
        Math.abs(s.b.x - s.t.x) > 0.4 ||
        Math.abs(s.sy.s - 1) > 0.002 ||
        s.rips.length > 0 ||
        s.sats.length > 0 ||
        s.mouse.s > 0.01
      // WebGL runs continuously while visible; spring renderer idles to 0 RAF frames when settled
      if (s.visible && (s.glc ? !s.reduce || busy : busy)) {
        s.raf = requestAnimationFrame(tick)
      } else {
        s.raf = 0
      }
    }
    s.raf = requestAnimationFrame(tick)
  }, [draw, step])

  /* ---- layout ---- */
  const measure = React.useCallback(() => {
    const nav = navRef.current
    const el = itemRefs.current[current]
    if (!nav || !el) return
    const s = st.current
    const pad = s.pad
    s.w = nav.offsetWidth
    s.h = nav.offsetHeight
    const T = s.t
    T.r = el.offsetHeight / 2
    T.q = Math.max(0, el.offsetWidth / 2 - T.r)
    T.cy = pad + el.offsetTop + el.offsetHeight / 2
    const nx = pad + el.offsetLeft + el.offsetWidth / 2
    if (!s.ready) {
      s.a.x = s.b.x = nx
      s.q = T.q
      s.ready = true
      draw()
    } else if (Math.abs(nx - T.x) > 0.5) {
      s.lead = Math.abs(nx - s.a.x) <= Math.abs(nx - s.b.x) ? 0 : 1
      s.lagFrom = performance.now() + 70
      s.moving = true
      s.split = false
    }
    T.x = nx
    if (s.glc) {
      const cv = canvasRef.current
      if (cv) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        const W = s.w + PAD * 2
        const Hh = s.h + PAD * 2
        if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(Hh * dpr)) {
          cv.width = Math.round(W * dpr)
          cv.height = Math.round(Hh * dpr)
          cv.style.width = `${W}px`
          cv.style.height = `${Hh}px`
        }
      }
    }
    loop()
  }, [current, draw, loop])

  React.useLayoutEffect(() => {
    ensureNimbusAssets()
  }, [])

  React.useEffect(() => {
    setRefract(supportsRefraction())
    const s = st.current
    s.reduce = !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    if (useWebGL) {
      const cv = canvasRef.current
      s.glc = cv ? initGL(cv) : null
      if (!s.glc) setGl("off")
    } else {
      s.glc = null
      setGl("off")
    }
    const lost = (e: Event) => {
      e.preventDefault()
      s.glc = null
      setGl("off")
    }
    const cv = canvasRef.current
    cv?.addEventListener("webglcontextlost", lost)
    const io = new IntersectionObserver(([e]) => {
      s.visible = e.isIntersecting
      if (s.visible) {
        draw()
        loop()
      }
    })
    if (navRef.current) io.observe(navRef.current)
    const vis = () => {
      s.visible = document.visibilityState === "visible"
      if (s.visible) loop()
    }
    document.addEventListener("visibilitychange", vis)
    return () => {
      cv?.removeEventListener("webglcontextlost", lost)
      io.disconnect()
      document.removeEventListener("visibilitychange", vis)
      cancelAnimationFrame(s.raf)
      s.raf = 0
    }
  }, [draw, loop, useWebGL])

  React.useLayoutEffect(() => {
    measure()
  }, [measure, items.length, compact, size])

  const measureRef = React.useRef(measure)
  measureRef.current = measure

  React.useEffect(() => {
    let lastW = -1
    const ro = new ResizeObserver(() => {
      const w = navRef.current?.offsetWidth ?? 0
      if (w !== lastW) {
        lastW = w
        st.current.ready = false
        measureRef.current()
      }
    })
    if (navRef.current) ro.observe(navRef.current)
    return () => ro.disconnect()
  }, [])

  React.useEffect(() => {
    draw()
    loop()
  }, [resolvedTone, themeId, draw, loop])

  /* ---- interaction ---- */
  const local = (clientX: number, clientY: number) => {
    const r = navRef.current!.getBoundingClientRect()
    const pad = st.current.pad
    return { x: clientX - r.left + pad, y: clientY - r.top + pad }
  }
  const ripple = (x: number, y: number, amp: number) => {
    const s = st.current
    if (s.reduce || !s.glc) return
    s.rips.push({ x, y, age: 0, amp })
    loop()
  }
  const iconCenter = (i: number) => {
    const el = iconRefs.current[i]
    if (!el) return null
    const b = el.getBoundingClientRect()
    return local(b.left + b.width / 2, b.top + b.height / 2)
  }
  const plip = () => {
    if (!sound) return
    try {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const ctx = (audio.current ||= new AC())
      const t = ctx.currentTime
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = "sine"
      o.frequency.setValueAtTime(420 + Math.random() * 80, t)
      o.frequency.exponentialRampToValueAtTime(1500, t + 0.07)
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(0.14, t + 0.008)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16)
      o.connect(g).connect(ctx.destination)
      o.start(t)
      o.stop(t + 0.18)
    } catch {
      // AudioContext locked or unavailable
    }
  }

  const select = (i: number) => {
    const kind = items[i]?.fx ?? (items[i]?.icon ? "pop" : "none")
    setFx((f) => ({ i, n: f.n + 1 }))
    plip()
    const c = iconCenter(i)
    if (c && kind === "drop") setTimeout(() => ripple(c.x, st.current.t.cy, 1.4), 430)
    if (c && kind === "plane") ripple(c.x, c.y, 0.6)
    if (i !== current) {
      if (active === undefined) setInner(i)
      onChange?.(i, items[i])
    }
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return
    e.preventDefault()
    const n = (current + (e.key === "ArrowRight" ? 1 : -1) + items.length) % items.length
    select(n)
    itemRefs.current[n]?.focus()
  }

  const onMove = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || !st.current.glc) return
    const p = local(e.clientX, e.clientY)
    const s = st.current
    s.mouse.x = p.x
    s.mouse.y = p.y
    s.mouse.on = true
    loop()
  }

  const ContainerTag = semanticRole === "group" ? "div" : "nav"

  return (
    <ContainerTag
      ref={navRef as React.RefObject<HTMLDivElement>}
      role={semanticRole === "group" ? "group" : undefined}
      className={["nimbus-nav", className].filter(Boolean).join(" ")}
      data-tone={resolvedTone}
      data-theme={themeId}
      data-gl={useWebGL ? gl : "off"}
      data-size={size}
      data-compact={compact === undefined ? undefined : String(compact)}
      data-responsive-collapse={responsiveCollapse ? "true" : undefined}
      data-mobile-hidden={hideOnMobile ? "true" : undefined}
      data-tip={tooltipPlacement}
      data-refract={useWebGL && refract ? "on" : "off"}
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      onPointerMove={onMove}
      onPointerLeave={() => {
        st.current.mouse.on = false
        loop()
      }}
      onPointerDown={(e) => {
        const p = local(e.clientX, e.clientY)
        ripple(p.x, p.y, 0.8)
      }}
      style={style}
    >
      <span className="nimbus-glass" aria-hidden="true" />
      {useWebGL && <canvas className="nimbus-water" ref={canvasRef} aria-hidden="true" />}
      <span className="nimbus-drop" ref={dropRef} aria-hidden="true" />
      {items.map((it, i) => {
        const kind = it.fx ?? "pop"
        const playing = fx.i === i && kind !== "none"
        const isActive = i === current
        const commonProps = {
          className: "nimbus-item",
          ...(semanticRole === "group"
            ? { "aria-pressed": isActive }
            : { "aria-current": isActive ? ("page" as const) : undefined }),
          onClick: () => select(i),
        }
        const content = (
          <>
            {it.icon && (
              <span
                className="nv-ico"
                key={playing ? fx.n : 0}
                data-fx={playing ? kind : undefined}
                ref={(el) => {
                  iconRefs.current[i] = el
                }}
              >
                {it.icon}
              </span>
            )}
            <span className="nimbus-label">{it.label}</span>
            <span className="nimbus-tip" aria-hidden="true">
              {it.label}
            </span>
          </>
        )
        return it.href ? (
          <a
            key={(it.id ?? it.label) + i}
            ref={(el) => {
              itemRefs.current[i] = el
            }}
            {...commonProps}
            href={it.href}
            aria-label={it.label}
          >
            {content}
          </a>
        ) : (
          <button
            key={(it.id ?? it.label) + i}
            ref={(el) => {
              itemRefs.current[i] = el
            }}
            {...commonProps}
            type="button"
            aria-label={it.label}
          >
            {content}
          </button>
        )
      })}
    </ContainerTag>
  )
}

export interface LiquidTabsProps<T extends string = string> {
  items: Array<{
    id: T
    label: string
    icon?: React.ReactNode
    fx?: NimbusFx
  }>
  value: T
  onChange: (id: T) => void
  ariaLabel: string
  size?: "xs" | "sm" | "md"
  tone?: "light" | "dark"
  themeId?: JapaneseThemeId
  sound?: boolean
  className?: string
}

/** Lightweight multi-instance liquid-pill segmented navigation using Waterline spring physics (zero extra WebGL contexts) */
export function LiquidTabs<T extends string = string>({
  items,
  value,
  onChange,
  ariaLabel,
  size = "sm",
  tone,
  themeId,
  sound = false,
  className,
}: LiquidTabsProps<T>) {
  const activeIdx = Math.max(
    0,
    items.findIndex((item) => item.id === value)
  )

  return (
    <div
      className={[
        "max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden rounded-full inline-block align-middle",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <LiquidNavbar
        items={items}
        active={activeIdx}
        onChange={(idx) => {
          const picked = items[idx]
          if (picked) onChange(picked.id)
        }}
        renderer="spring"
        semanticRole="group"
        size={size}
        tone={tone}
        themeId={themeId}
        sound={sound}
        ariaLabel={ariaLabel}
        className="w-max"
      />
    </div>
  )
}

/** alias for registries that import { Component } */
export { LiquidNavbar as Component }

export default LiquidNavbar
