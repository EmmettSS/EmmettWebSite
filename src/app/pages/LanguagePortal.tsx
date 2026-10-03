import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { ArrowLeft, ArrowRight, Languages, Orbit, Sparkles } from "lucide-react";
import { Link } from "react-router";
import { AmbientBackground, Magnetic } from "../components/MotionKit";

export function LanguagePortal(){
 const mx=useMotionValue(0),my=useMotionValue(0);const sx=useSpring(mx,{stiffness:70,damping:20}),sy=useSpring(my,{stiffness:70,damping:20});
 const rx=useTransform(sy,[-.5,.5],[7,-7]),ry=useTransform(sx,[-.5,.5],[-7,7]);
 return <main onPointerMove={e=>{mx.set(e.clientX/window.innerWidth-.5);my.set(e.clientY/window.innerHeight-.5)}} className="relative grid min-h-screen overflow-hidden bg-[var(--deep)] px-5 py-10 text-[var(--text)]"><AmbientBackground/>
  <motion.div style={{x:useTransform(sx,[-.5,.5],[-55,55]),y:useTransform(sy,[-.5,.5],[-35,35])}} className="portal-ring pointer-events-none absolute left-1/2 top-1/2 h-[38rem] w-[38rem] -translate-x-1/2 -translate-y-1/2 rounded-full"/>
  <div className="relative z-10 m-auto w-full max-w-6xl">
   <motion.div initial={{opacity:0,y:15}} animate={{opacity:1,y:0}} className="mb-10 flex items-center justify-center gap-3 font-mono text-xs tracking-[.25em] text-[var(--bright)]"><Languages className="h-4 w-4"/> SELECT YOUR EXPERIENCE</motion.div>
   <motion.div style={{rotateX:rx,rotateY:ry,transformPerspective:1200}} className="overflow-hidden rounded-[2rem] border border-[var(--line)] bg-[#081b13]/75 shadow-[0_50px_140px_rgba(0,0,0,.5)] backdrop-blur-2xl">
    <div className="grid lg:grid-cols-2">
     <LanguageCard lang="en" label="English" sub="Enter the engineering system" icon={<ArrowRight/>}/>
     <LanguageCard lang="fa" label="فارسی" sub="ورود به تجربه فارسی" icon={<ArrowLeft/>} rtl/>
    </div>
   </motion.div>
   <motion.p initial={{opacity:0}} animate={{opacity:1}} transition={{delay:.7}} className="mt-7 text-center text-xs text-white/30">You can change the language anytime from the navigation bar · زبان را هر زمان از منوی بالا تغییر دهید</motion.p>
  </div>
 </main>
}
function LanguageCard({lang,label,sub,icon,rtl=false}:{lang:"fa"|"en";label:string;sub:string;icon:React.ReactNode;rtl?:boolean}){
 return <Link to={`/${lang}`} onClick={()=>localStorage.setItem("emmett-language",lang)} dir={rtl?"rtl":"ltr"} className="portal-card group relative min-h-[440px] overflow-hidden p-10 lg:p-14">
  <div className="portal-scan pointer-events-none absolute inset-0"/>
  <motion.div animate={{rotate:360}} transition={{duration:18,repeat:Infinity,ease:"linear"}} className="absolute end-8 top-8 text-[var(--bright)]/25"><Orbit className="h-16 w-16"/></motion.div>
  <Sparkles className="h-6 w-6 text-[var(--bright)]"/>
  <div className="absolute inset-x-10 bottom-12 lg:inset-x-14">
   <span className="font-mono text-[10px] tracking-[.25em] text-[var(--bright)]">0{lang==="en"?1:2} / LANGUAGE</span>
   <h1 className="mt-4 text-6xl font-medium tracking-[-.05em] lg:text-8xl">{label}</h1>
   <div className="mt-7 flex items-center justify-between border-t border-[var(--line)] pt-5 text-white/45"><span>{sub}</span><Magnetic><span className="grid h-12 w-12 place-items-center rounded-full bg-[var(--emerald)] text-[var(--deep)] transition group-hover:scale-110">{icon}</span></Magnetic></div>
  </div>
 </Link>
}
