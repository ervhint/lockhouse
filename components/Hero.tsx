"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { loadKeys, type Saved } from "@/lib/keys";
import Logo from "./Logo";
import "./hero.css";

const VS = `#version 300 es
void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);gl_Position=vec4(p*2.-1.,0,1);}`;
const FS = `#version 300 es
precision highp float;
uniform vec2 R;uniform float T,S,K;out vec4 O;
float h(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float a=.5,s=0.;mat2 m=mat2(1.6,1.2,-1.2,1.6);p=mat2(.8,.6,-.6,.8)*p+5.3;for(int i=0;i<5;i++){s+=a*n(p);p=m*p;a*=.5;}return s;}
void main(){
  vec2 uv=gl_FragCoord.xy/R;uv.y=1.-uv.y;
  float asp=R.x/R.y;vec2 p=vec2(uv.x*asp,uv.y);
  float t=T*.05;
  vec2 w=vec2(fbm(p*1.3+vec2(t,-t*.6)),fbm(p*1.3+vec2(-t*.8,t)+7.));
  float d=fbm(p*1.9+w*1.7+vec2(t*1.6,-t*1.1+S*.5));
  float e=fbm(p*.9-w+vec2(-t,t*.5)+3.);
  float low=smoothstep(.70,1.04,uv.y+(d-.5)*.34);
  float side=smoothstep(.2,.0,uv.x+(e-.5)*.28)+smoothstep(.8,1.,uv.x+(e-.5)*.28);
  side*=smoothstep(.25,.6,uv.y)*.2;
  float wisps=smoothstep(.5,.78,d)*smoothstep(.22,.5,uv.y)*smoothstep(.86,.6,uv.y)*.18;
  float rest=clamp(low+side+wisps,0.,1.);
  float front=1.02-S*.68;
  float rise=smoothstep(front-.02,front+.26,uv.y+(d-.5)*.5);
  float haze=S*(.3+.46*d);
  float a=clamp(max(rest,max(rise*.97,haze)),0.,1.);
  vec3 dayA=vec3(.97,.93,.84),dayB=vec3(.79,.78,.71);
  vec3 nitA=vec3(.40,.45,.57),nitB=vec3(.15,.19,.29);
  vec3 c=mix(mix(dayB,dayA,d*1.15),mix(nitB,nitA,d*1.1),K);
  float porch=exp(-dot((uv-vec2(.72,.74))*vec2(1.7,2.6),(uv-vec2(.72,.74))*vec2(1.7,2.6))*3.2);
  c=mix(c,vec3(.86,.55,.27),K*porch*.42*(1.-S));
  O=vec4(c*a,a);
}`;

// Welcome screen (S-01): sample 02, the Today / After Q-Day switch with the fog and the house.
// Returning = keys already in this browser (their name comes from there).
export default function Hero({ signedIn }: { signedIn: boolean }) {
  const root = useRef<HTMLElement>(null);
  const [saved, setSaved] = useState<Saved | null>(null);
  useEffect(() => setSaved(loadKeys()), []);
  // The next step for this browser: make keys, open the house, sign in again, or register the padlock.
  const next = !saved ? { href: "/keys", label: "Make Your Keys" }
    : signedIn ? { href: "/house", label: "Open My House", line: "You are signed in.", link: "Open Your House" }
    : saved.signedInBefore ? { href: "/sign-in", label: "Sign In", line: "Your keys are in this browser.", link: "Next: Sign In" }
    : { href: "/padlock", label: "Continue", line: "Your keys are in this browser.", link: "Next: Register Your Padlock" };

  useEffect(() => {
    const el = root.current!;
    const $ = <T extends HTMLElement>(id: string) => el.querySelector<T>("#" + id)!;
    const calm = matchMedia("(prefers-reduced-motion:reduce)").matches;
    const SINK = 240, RISE = 820, DEPTH = 0.27;
    const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
    const smooth = (a: number, b: number, x: number) => { x = clamp((x - a) / (b - a)); return x * x * (3 - 2 * x); };
    let target = 1, from = 1, start = -1e9, queued: number | null = null, swapped = true, k = 1;
    let animating = false, clock = 0, raf = 0, still: (() => void) | null = null;

    const cv = $<HTMLCanvasElement>("fog");
    const gl = cv.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false });
    const U: Record<string, WebGLUniformLocation | null> = {};
    if (gl) {
      const sh = (t: number, s: string) => { const o = gl.createShader(t)!; gl.shaderSource(o, s); gl.compileShader(o); return o; };
      const pr = gl.createProgram()!;
      gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS));
      gl.linkProgram(pr); gl.useProgram(pr);
      for (const u of ["R", "T", "S", "K"]) U[u] = gl.getUniformLocation(pr, u);
    }
    const size = () => {
      if (!gl) return;
      const w = Math.round(Math.min(innerWidth, 960)), h = Math.round((w * innerHeight) / innerWidth);
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; gl.viewport(0, 0, w, h); }
    };
    addEventListener("resize", size); size();

    const show = (n: number) => { $("setM").classList.toggle("is-on", !n); $("setN").classList.toggle("is-on", !!n); };
    const begin = (n: number, now: number) => { target = n; from = k; start = now; swapped = false; animating = true; };
    const pick = (n: number) => {
      if (n === target && queued === null) return;
      $("bm").setAttribute("aria-pressed", String(!n)); $("bn").setAttribute("aria-pressed", String(!!n));
      if (calm) { target = n; k = n; el.style.setProperty("--k", String(n)); el.style.setProperty("--k2", String(n)); show(n); still?.(); return; }
      if (animating) queued = n; else begin(n, clock);
    };
    $("bm").onclick = () => pick(0); $("bn").onclick = () => pick(1);

    const frame = (now: number) => {
      clock = now;
      const d = now - start; let y = 0, s = 0, dip = 0, k2 = k;
      if (animating) {
        if (d < SINK) { const x = d / SINK; y = x * x * (3 - 2 * x) * DEPTH; }
        else {
          if (!swapped) { swapped = true; show(target); }
          const x = clamp((d - SINK) / RISE); y = Math.pow(1 - x, 3.4) * DEPTH;
        }
        s = smooth(0, SINK * 0.92, d) * (1 - smooth(SINK + 70, SINK + RISE * 0.92, d));
        dip = smooth(30, 190, d) * (1 - smooth(330, 720, d));
        k = from + (target - from) * smooth(120, 520, d);
        k2 = from + (target - from) * smooth(340, 760, d);
        if (d >= SINK + RISE) {
          animating = false; k = k2 = target; y = s = dip = 0;
          if (queued !== null && queued !== target) { const q = queued; queued = null; begin(q, now); } else queued = null;
        }
      }
      el.style.setProperty("--sink", (y * innerHeight).toFixed(1) + "px");
      el.style.setProperty("--k", k.toFixed(3)); el.style.setProperty("--k2", k2.toFixed(3)); el.style.setProperty("--dip", dip.toFixed(3));
      if (gl) {
        gl.uniform2f(U.R, cv.width, cv.height); gl.uniform1f(U.T, now / 1000); gl.uniform1f(U.S, s); gl.uniform1f(U.K, k);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
    };
    // Reduced motion: no loop, no drifting fog. Draw one still frame, and again on resize or switch.
    const loop = (t: number) => { frame(t); raf = requestAnimationFrame(loop); };
    if (calm) { still = () => frame(0); still(); addEventListener("resize", still); } else raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); removeEventListener("resize", size); if (still) removeEventListener("resize", still); };
  }, []);

  const imgStyle = { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "50% 62%" } as const;
  return (
    <main className="hero" ref={root}>
      <div className="layer sky">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img id="skyM" alt="" src="/img/house/sky-morning.webp" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img id="skyN" alt="" src="/img/house/sky-night.webp" />
      </div>
      <div className="layer home">
        <div className="set" id="setM">
          <div className="layer ground"><img alt="" src="/img/house/ground-morning.webp" /></div>
          <img className="cut" alt="A charcoal house in soft morning light" src="/img/house/house-morning.webp" style={imgStyle} />
        </div>
        <div className="set is-on" id="setN">
          <div className="layer ground"><img alt="" src="/img/house/ground-night.webp" /></div>
          <img className="cut" alt="The same house at night with warm amber windows" src="/img/house/house-night.webp" style={imgStyle} />
        </div>
      </div>
      <div className="tilt" />
      <canvas id="fog" aria-hidden="true" />
      <div className="ui">
        <header className="bar">
          <Link className="logo" href="/" aria-label="Lockhouse"><Logo />Lockhouse</Link>
          <div className="side">
            {next.href !== "/house" && next.href !== "/sign-in" && <Link href="/sign-in">Sign In</Link>}
            <Link className="cta" href={next.href}>{next.label}</Link>
          </div>
        </header>
        <h1><span className="l1">Your Family Papers</span><span><i>Stay Locked</i> <span className="y nw">After Q-Day</span></span></h1>
        <div className="dock">
          <div className="toggle" role="group" aria-label="Before or after Q-Day">
            <button id="bm" aria-pressed="false"><b>Today</b><small>Locked on This Device</small></button>
            <button id="bn" aria-pressed="true"><b>After Q-Day</b><small>Still Locked</small></button>
          </div>
          <p className="cap">Keep your family&apos;s important papers in one house. Every copy is locked in your own browser <br />with <span className="nw">ML-KEM-1024</span>, so it stays shut even when the old locks break.</p>
          {saved
            ? <p className="cap">Welcome back, {saved.name}. {next.line} <Link href={next.href} style={{ textDecoration: "underline" }}>{next.link}</Link></p>
            : <p className="cap">Already have secret words? <Link href="/keys?restore" style={{ textDecoration: "underline" }}>Restore Your Keys</Link></p>}
        </div>
      </div>
    </main>
  );
}
