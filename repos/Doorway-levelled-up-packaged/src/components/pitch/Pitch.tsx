import React, { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";

interface PitchProps {
  onGoToDemo: () => void;
}

export function Pitch({ onGoToDemo }: PitchProps) {
  const [slide, setSlide] = useState<0 | 1>(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const [warningsCount, setWarningsCount] = useState(0);
  const [activeStep, setActiveStep] = useState(0);

  // Responsive stage scaler (1920x1080 standard aspect ratio)
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const fit = () => {
      // Calculate available height taking header into account (~54px)
      const scale = Math.min(window.innerWidth / 1920, (window.innerHeight - 56) / 1080);
      stage.style.setProperty("--s", String(scale));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (["ArrowRight", "PageDown", " ", "Enter"].includes(e.key)) {
        if (slide === 0) {
          e.preventDefault();
          setSlide(1);
        } else if (slide === 1 && e.key !== " ") {
          e.preventDefault();
          onGoToDemo();
        }
      } else if (["ArrowLeft", "PageUp", "Backspace"].includes(e.key)) {
        if (slide === 1) {
          e.preventDefault();
          setSlide(0);
        }
      } else if (e.key === "Home") {
        setSlide(0);
      } else if (e.key === "End") {
        setSlide(1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [slide, onGoToDemo]);

  // Slide 1 counter loop
  useEffect(() => {
    if (slide !== 0) return;
    setWarningsCount(1);
    const id = setInterval(() => {
      setWarningsCount((c) => c + 1);
    }, 2600);
    return () => clearInterval(id);
  }, [slide]);

  // Slide 2 step pulse loop
  useEffect(() => {
    if (slide !== 1) return;
    const id = setInterval(() => {
      setActiveStep((s) => (s + 1) % 5);
    }, 2200);
    return () => clearInterval(id);
  }, [slide]);

  return (
    <div className="relative min-h-[calc(100vh-56px)] w-full overflow-hidden bg-[#0e1a24] text-[#f7f2e8]">
      <style>{`
        :root {
          --night: #0e1a24; --night-2: #162836; --night-3: #1d3447;
          --paper: #f7f2e8; --paper-2: #ece4d3;
          --lamp: #e8a33d; --lamp-soft: rgba(232,163,61,.16);
          --clay: #c4694a; --sage: #7fa08a;
          --serif: Georgia, "Times New Roman", serif;
          --sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }
        .pitch-stage {
          position: absolute; left: 50%; top: 50%; width: 1920px; height: 1080px;
          transform: translate(-50%, -50%) scale(var(--s, 1));
          transform-origin: center center; overflow: hidden;
        }
        .pitch-deck { position: absolute; inset: 0; }
        .pitch-slide {
          position: absolute; inset: 0; padding: 65px 96px 119px;
          display: grid; align-content: center; gap: 35px;
          opacity: 0; transform: translateX(60px); pointer-events: none;
          transition: opacity .6s ease, transform .7s cubic-bezier(.2,.7,.2,1);
        }
        .pitch-slide.on { opacity: 1; transform: none; pointer-events: auto; }
        .pitch-slide.before { transform: translateX(-60px); }
        .pitch-glow {
          position: absolute; inset: 0; pointer-events: none; z-index: 0;
          background: radial-gradient(1150px 540px at 85% 12%, rgba(232,163,61,.13), transparent 70%),
                      radial-gradient(960px 540px at 0% 100%, rgba(127,160,138,.08), transparent 70%);
        }
        .pitch-slide > * { position: relative; z-index: 1; }
        .eyebrow { font-size: 15px; letter-spacing: .24em; text-transform: uppercase; color: var(--lamp); font-weight: 650; }
        .pitch-h1 { font-family: var(--serif); font-weight: 500; line-height: 1.05; letter-spacing: -.01em; font-size: 92px; max-width: 16ch; }
        .pitch-h1 em { font-style: normal; color: var(--lamp); }
        .pitch-lead { font-size: 26px; line-height: 1.45; color: rgba(247,242,232,.82); max-width: 44ch; }
        .rise { animation: pitchRise .8s cubic-bezier(.2,.7,.2,1) forwards; }
        @keyframes pitchRise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }

        .s1 { grid-template-columns: minmax(0, 1.15fr) minmax(0, .85fr); column-gap: 80px; align-items: center; }
        .s1 .copy { display: grid; gap: 28px; }
        .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px; margin-top: 11px; }
        .stat { border-top: 2px solid var(--lamp); padding-top: 15px; }
        .num { font-family: var(--serif); font-size: 66px; line-height: 1; color: var(--paper); font-variant-numeric: tabular-nums; }
        .cap { margin-top: 8px; font-size: 17px; line-height: 1.4; color: rgba(247,242,232,.74); }
        .punch { font-family: var(--serif); font-size: 34px; color: var(--paper); border-left: 3px solid var(--lamp); padding-left: 16px; line-height: 1.25; max-width: 30ch; }
        .src { position: absolute; left: 96px; right: 96px; bottom: 90px; font-size: 13px; color: rgba(247,242,232,.46); line-height: 1.5; z-index: 1; }

        .feed { position: relative; height: 560px; display: grid; place-items: center; }
        .feed .count { position: absolute; top: 0; right: 0; text-align: right; font-size: 15px; letter-spacing: .14em; text-transform: uppercase; color: rgba(247,242,232,.55); }
        .feed .count b { display: block; font-family: var(--serif); letter-spacing: 0; text-transform: none; font-weight: 500; font-size: 60px; color: var(--paper); font-variant-numeric: tabular-nums; }
        .warn { width: min(100%, 420px); background: #fff; color: #1b1a18; border-radius: 6px; padding: 28px; box-shadow: 0 30px 70px rgba(0,0,0,.5); border-top: 5px solid #1b1a18;
                animation: pitchWarnCycle 2.6s ease-in-out infinite; }
        .warn small { display: block; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: #6b6558; margin-bottom: 10px; }
        .warn h3 { font-family: var(--serif); font-weight: 600; font-size: 28px; line-height: 1.15; margin-bottom: 10px; }
        .warn p { font-size: 15px; color: #444; line-height: 1.45; }
        .warn .row { display: flex; gap: 10px; margin-top: 16px; }
        .warn .b { height: 34px; border-radius: 4px; background: #1f4e79; flex: 1; }
        .warn .b.o { background: transparent; border: 2px solid #1f4e79; }
        .warn .x { position: absolute; top: 10px; right: 14px; font-size: 22px; color: #6b6558; line-height: 1; }
        @keyframes pitchWarnCycle {
          0% { opacity: 0; transform: translateY(28px) scale(.97); }
          16%, 80% { opacity: 1; transform: none; }
          92%, 100% { opacity: 0; transform: translateY(-10px) scale(.94); }
        }
        .cursor { position: absolute; width: 22px; height: 22px; z-index: 3; pointer-events: none;
          background: radial-gradient(circle, var(--lamp) 0 38%, rgba(232,163,61,.25) 40% 100%); border-radius: 50%;
          animation: pitchCur 2.6s ease-in-out infinite; }
        @keyframes pitchCur { 0%, 52% { opacity: 0; transform: translate(70px, 120px); } 62% { opacity: 1; transform: translate(70px, 120px); } 76% { opacity: 1; transform: translate(150px, -92px); } 84% { opacity: 1; transform: translate(150px, -92px) scale(.7); } 92%, 100% { opacity: 0; transform: translate(150px, -92px) scale(.7); } }
        .feed .note { position: absolute; bottom: 0; left: 0; right: 0; text-align: center; font-size: 14px; color: rgba(247,242,232,.55); }

        .s2 { align-content: center; }
        .s2 .head { display: grid; gap: 19px; }
        .s2 .pitch-h1 { max-width: 20ch; }
        .track { position: relative; display: grid; grid-template-columns: repeat(5, 1fr); gap: 22px; margin-top: 37px; }
        .track::before { content: ""; position: absolute; left: 4%; right: 4%; top: -16px; height: 2px; background: linear-gradient(90deg, rgba(232,163,61,.15), rgba(232,163,61,.45), rgba(232,163,61,.15)); z-index: 0; }
        .step { position: relative; z-index: 1; display: grid; gap: 10px; align-content: start; opacity: .52; transform: translateY(0); transition: opacity .5s, transform .5s; }
        .step.lit { opacity: 1; transform: translateY(-6px); }
        .mini { height: 190px; border-radius: 12px; background: var(--night-2); border: 1px solid rgba(247,242,232,.14); padding: 14px; position: relative; overflow: hidden; transition: border-color .5s, box-shadow .5s; }
        .step.lit .mini { border-color: var(--lamp); box-shadow: 0 0 0 1px var(--lamp), 0 18px 44px rgba(232,163,61,.18); }
        .ln { height: 6px; border-radius: 3px; background: rgba(247,242,232,.28); margin-bottom: 7px; }
        .ln.s { width: 62%; } .ln.m { width: 82%; } .ln.h { height: 9px; background: rgba(247,242,232,.82); width: 70%; margin-bottom: 10px; }
        .btn { height: 18px; border-radius: 4px; background: var(--lamp); margin-top: 9px; }
        .btn.g { background: transparent; border: 1.5px solid rgba(247,242,232,.45); }
        .m-gate { border-radius: 4px; border-top: 4px solid var(--lamp); }
        .m-card { border-radius: 22px; }
        .m-fork .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-top: 8px; } .m-fork .grid i { height: 18px; border-radius: 5px; background: rgba(247,242,232,.14); border: 1px solid rgba(247,242,232,.2); display: block; }
        .m-wave { display: grid; place-items: center; }
        .m-hall { border-left: 4px solid var(--lamp); }
        .bub { background: var(--night-3); border-radius: 10px 10px 10px 2px; padding: 6px 8px; margin-bottom: 6px; max-width: 88%; } .bub .ln { margin: 0; background: rgba(247,242,232,.6); }
        .m-door { background: #0b141c; display: grid; align-content: center; gap: 8px; }
        .m-door .tile { width: 22px; height: 28px; border-radius: 6px; background: var(--lamp-soft); border: 1px solid rgba(232,163,61,.5); }
        .m-door .big { height: 24px; border-radius: 6px; background: var(--lamp); display: grid; place-items: center; font-size: 10px; font-weight: 800; color: #0e1a24; letter-spacing: .04em; }
        .step-name { font-family: var(--serif); font-size: 22px; color: var(--paper); }
        .ask { font-size: 15px; line-height: 1.35; color: rgba(247,242,232,.72); }
        .pulse { position: absolute; top: -24px; width: 16px; height: 16px; border-radius: 50%; background: var(--lamp); box-shadow: 0 0 0 6px rgba(232,163,61,.22), 0 0 28px rgba(232,163,61,.8); z-index: 2; transition: left .9s cubic-bezier(.4,0,.2,1); }
        .points { display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; margin-top: 11px; }
        .pt { background: rgba(247,242,232,.05); border: 1px solid rgba(247,242,232,.12); border-radius: 12px; padding: 17px 20px; }
        .pt b { display: block; font-family: var(--serif); font-weight: 500; font-size: 22px; color: var(--lamp); margin-bottom: 4px; }
        .pt span { font-size: 16px; line-height: 1.4; color: rgba(247,242,232,.78); }
        .bet { position: absolute; left: 96px; bottom: 90px; font-size: 13px; color: rgba(247,242,232,.46); z-index: 1; }
        .demo-btn { position: absolute; right: 96px; bottom: 76px; z-index: 2; display: inline-flex; align-items: center; gap: 10px; padding: 12px 24px; border-radius: 999px; background: var(--lamp); color: #0e1a24; font-weight: 750; font-size: 18px; text-decoration: none; box-shadow: 0 10px 30px rgba(232,163,61,.3); cursor: pointer; border: none; transition: transform .2s, box-shadow .2s; }
        .demo-btn:hover { transform: translateY(-2px); box-shadow: 0 14px 40px rgba(232,163,61,.45); }

        .pitch-nav { position: absolute; left: 50%; bottom: 28px; transform: translateX(-50%); display: flex; gap: 10px; z-index: 10; align-items: center; }
        .pitch-dot { width: 34px; height: 6px; border-radius: 3px; border: 0; background: rgba(247,242,232,.25); cursor: pointer; transition: background .3s, width .3s; }
        .pitch-dot.on { background: var(--lamp); width: 52px; }
        .brand-corner { position: absolute; top: 32px; left: 96px; z-index: 10; display: flex; align-items: center; gap: 10px; font-family: var(--serif); font-size: 22px; }
        .brand-corner i { width: 20px; height: 26px; border-radius: 5px; background: linear-gradient(90deg, var(--lamp) 0 52%, var(--paper-2) 52% 100%); box-shadow: inset 0 0 0 2px rgba(14,26,36,.5); display: inline-block; }
        .brand-corner span { color: rgba(247,242,232,.5); font-family: var(--sans); font-size: .62em; letter-spacing: .14em; text-transform: uppercase; margin-left: 6px; }
        .pitch-hint { position: absolute; right: 96px; top: 34px; z-index: 10; font-size: 12px; color: rgba(247,242,232,.4); letter-spacing: .08em; }
      `}</style>

      <div className="pitch-stage" ref={stageRef}>
        <div className="brand-corner">
          <i /> Doorway <span>Stop Before It Starts</span>
        </div>
        <div className="pitch-hint">← → to move · Enter to launch demo</div>

        <div className="pitch-deck">
          {/* SLIDE 1 */}
          <section className={`pitch-slide s1 ${slide === 0 ? "on" : "before"}`} aria-label="The problem">
            <div className="pitch-glow" />
            <div className="copy">
              <div className="eyebrow rise">The problem</div>
              <h1 className="pitch-h1 rise">Millions of warnings.<br /><em>No detectable change.</em></h1>
              <p className="pitch-lead rise">
                In a 140-day randomised trial, over three million searches triggered a warning. Searching did not measurably fall. Yet people do want a way out, and cannot find one.
              </p>
              <div className="stats">
                <div className="stat rise">
                  <div className="num">55%</div>
                  <div className="cap">of 4,493 people surveyed said they <b>wanted to stop</b></div>
                </div>
                <div className="stat rise">
                  <div className="num">70.2%</div>
                  <div className="cap">of the 266 who tried to get help <b>struggled to find an anonymous way</b></div>
                </div>
                <div className="stat rise">
                  <div className="num">700×</div>
                  <div className="cap">spread in help-click rates across four deployments: <b>0.0175% to 12.44%</b></div>
                </div>
              </div>
              <p className="punch rise">
                A sign tells people to stop.<br />It doesn’t open a door.
              </p>
            </div>

            <div className="feed" aria-hidden="true">
              <div className="count">Warnings shown <b>{warningsCount}</b></div>
              <div className="warn">
                <span className="x">×</span>
                <small>Shown by this site</small>
                <h3>This material is illegal and harms children</h3>
                <p>The same warning, in the same words, every time the person returns.</p>
                <div className="row"><div className="b" /><div className="b o" /></div>
              </div>
              <div className="cursor" />
              <div className="note">Same card. Same reaction: close it.</div>
            </div>

            <div className="src">
              Sources: Ahmia 140-day randomised field experiment, Ó Ciardha et al. 2026 (3.1M warnings, no detectable reduction in searching) · Insoll et al. 2024, JOTS 2(4) (n = 4,493; 266 sought help) · UNICRI research dossier, four-deployment table.
            </div>
          </section>

          {/* SLIDE 2 */}
          <section className={`pitch-slide s2 ${slide === 1 ? "on" : ""}`} aria-label="How Doorway solves it">
            <div className="pitch-glow" />
            <div className="head">
              <div className="eyebrow rise">Our answer</div>
              <h1 className="pitch-h1 rise">A door, <em>not a sign.</em></h1>
              <p className="pitch-lead rise">
                Doorway is a response layer a platform installs. When the platform’s own tools flag a search, the person meets a <b>different card each time they come back</b>, and every one leads somewhere.
              </p>
            </div>

            <div className="track rise">
              <div
                className="pulse"
                style={{
                  left: `${(activeStep * 20) + 7}%`,
                }}
              />

              <div className={`step ${activeStep === 0 ? "lit" : ""}`}>
                <div className="mini m-gate">
                  <div className="ln h" /><div className="ln m" /><div className="ln s" /><div className="btn" /><div className="btn g" />
                </div>
                <div className="step-name">Gate</div><div className="ask">What is this?</div>
              </div>

              <div className={`step ${activeStep === 1 ? "lit" : ""}`}>
                <div className="mini m-fork">
                  <div className="ln h" /><div className="grid"><i /><i /><i /><i /><i /><i /></div><div className="btn" />
                </div>
                <div className="step-name">Fork</div><div className="ask">Where do I stand?</div>
              </div>

              <div className={`step ${activeStep === 2 ? "lit" : ""}`}>
                <div className="mini m-wave">
                  <svg viewBox="0 0 200 90" aria-hidden="true" style={{ width: "100%", height: "auto" }}>
                    <path d="M5 80 C40 80 55 12 90 12 S150 78 195 80" fill="none" stroke="rgba(247,242,232,.35)" strokeWidth="3" strokeLinecap="round" />
                    <circle r="6" fill="#e8a33d">
                      <animateMotion dur="3.2s" repeatCount="indefinite" path="M5 80 C40 80 55 12 90 12 S150 78 195 80" />
                    </circle>
                  </svg>
                </div>
                <div className="step-name">Wave</div><div className="ask">What do I do with this urge?</div>
              </div>

              <div className={`step ${activeStep === 3 ? "lit" : ""}`}>
                <div className="mini m-hall">
                  <div className="ln h" /><div className="bub"><div className="ln m" /></div><div className="bub"><div className="ln s" /></div><div className="bub"><div className="ln m" /></div>
                </div>
                <div className="step-name">Hallway</div><div className="ask">What happens if I reach out?</div>
              </div>

              <div className={`step ${activeStep === 4 ? "lit" : ""}`}>
                <div className="mini m-door">
                  <div className="tile" /><div className="ln h" style={{ margin: 0 }} /><div className="big">CALL NOW</div>
                </div>
                <div className="step-name">Door</div><div className="ask">Is it still open?</div>
              </div>
            </div>

            <div className="points">
              <div className="pt rise">
                <b>The platform decides</b>
                <span>Doorway never detects anything and never sees what was typed. It hears only that a search was flagged.</span>
              </div>
              <div className="pt rise">
                <b>Seven numbers, no person</b>
                <span>Only aggregate counts leave the Door. No time of day, no identity, and small cells are hidden.</span>
              </div>
              <div className="pt rise">
                <b>The moderator sees counts</b>
                <span>A Desk shows what was shown and how many reached for help, labelled as self-reported.</span>
              </div>
            </div>

            <div className="bet">
              Why a different card each time is our design bet. It is not yet tested with visitors.
            </div>

            {/* Seamless transition to live demo */}
            <button
              className="demo-btn"
              onClick={onGoToDemo}
              title="Launch the live interactive Doorway prototype"
            >
              <span>See it live</span>
              <ArrowRight className="h-5 w-5" />
            </button>
          </section>
        </div>

        {/* Navigation dots */}
        <div className="pitch-nav">
          <button
            className={`pitch-dot ${slide === 0 ? "on" : ""}`}
            onClick={() => setSlide(0)}
            aria-label="Slide 1: The Problem"
          />
          <button
            className={`pitch-dot ${slide === 1 ? "on" : ""}`}
            onClick={() => setSlide(1)}
            aria-label="Slide 2: The Solution"
          />
        </div>
      </div>
    </div>
  );
}
