import { useRef, useEffect, useState, useCallback } from "react";
import { gsap } from "gsap";

const DEFAULT_PARTICLE_COUNT = 10;
const DEFAULT_SPOTLIGHT_RADIUS = 300;
const DEFAULT_GLOW_COLOR = "0, 255, 220";
const MOBILE_BREAKPOINT = 768;

const cardData = [
  {
    stars: 5,
    quote:
      "The ability to get comprehensive insights from multiple AI agents simultaneously is a game-changer. We've seen a 60% reduction in research time.",
    name: "Phillip Kreger",
    role: "Assistant Professor, UC Berkeley",
  },
  {
    stars: 5,
    quote:
      "Sagent AI has completely transformed our research workflow. What used to take our team 3-4 hours now happens in minutes. The multi-agent routing is brilliant.",
    name: "Rajesh Kumar",
    role: "Product, Meesho",
  },
  {
    stars: 5,
    quote:
      "Finally, an AI platform that understands context and routes to the right specialist. Our team’s productivity has increased by 40% since adopting Sagent AI.",
    name: "Arjun Patel",
    role: "Analytics, Walmart",
  },
];

/* -------------------------------------------
   Particle + Spotlight Helper Logic (unchanged)
-------------------------------------------- */

const createParticleElement = (x, y, color = DEFAULT_GLOW_COLOR) => {
  const el = document.createElement("div");
  el.className = "particle";
  el.style.cssText = `
    position:absolute;width:4px;height:4px;border-radius:50%;
    background:rgba(${color},1);box-shadow:0 0 6px rgba(${color},0.6);
    pointer-events:none;z-index:100;left:${x}px;top:${y}px;
  `;
  return el;
};

const calculateSpotlightValues = (radius) => ({
  proximity: radius * 0.5,
  fadeDistance: radius * 0.75,
});

const updateCardGlowProperties = (card, mouseX, mouseY, glow, radius) => {
  const rect = card.getBoundingClientRect();
  const relativeX = ((mouseX - rect.left) / rect.width) * 100;
  const relativeY = ((mouseY - rect.top) / rect.height) * 100;

  card.style.setProperty("--glow-x", `${relativeX}%`);
  card.style.setProperty("--glow-y", `${relativeY}%`);
  card.style.setProperty("--glow-intensity", glow.toString());
  card.style.setProperty("--glow-radius", `${radius}px`);
};

const ParticleCard = ({
  children,
  className = "",
  disableAnimations = false,
  style,
  particleCount = DEFAULT_PARTICLE_COUNT,
  glowColor = DEFAULT_GLOW_COLOR,
  enableTilt = true,
}) => {
  const cardRef = useRef(null);
  const particlesRef = useRef([]);
  const timeoutsRef = useRef([]);
  const isHoveredRef = useRef(false);
  const memoizedParticles = useRef([]);
  const particlesInitialized = useRef(false);

  const initializeParticles = useCallback(() => {
    if (particlesInitialized.current || !cardRef.current) return;

    const { width, height } = cardRef.current.getBoundingClientRect();
    memoizedParticles.current = Array.from({ length: particleCount }, () =>
      createParticleElement(
        Math.random() * width,
        Math.random() * height,
        glowColor
      )
    );
    particlesInitialized.current = true;
  }, [particleCount, glowColor]);

  const clearAllParticles = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];

    particlesRef.current.forEach((p) => {
      gsap.to(p, {
        scale: 0,
        opacity: 0,
        duration: 0.3,
        ease: "back.in(1.7)",
        onComplete: () => p.remove(),
      });
    });

    particlesRef.current = [];
  }, []);

  const animateParticles = useCallback(() => {
    if (!cardRef.current || !isHoveredRef.current) return;

    if (!particlesInitialized.current) initializeParticles();

    memoizedParticles.current.forEach((particle, index) => {
      const timeoutId = setTimeout(() => {
        if (!isHoveredRef.current || !cardRef.current) return;

        const clone = particle.cloneNode(true);
        cardRef.current.appendChild(clone);
        particlesRef.current.push(clone);

        gsap.fromTo(
          clone,
          { scale: 0, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.3, ease: "back.out(1.7)" }
        );

        gsap.to(clone, {
          x: (Math.random() - 0.5) * 80,
          y: (Math.random() - 0.5) * 80,
          duration: 2,
          repeat: -1,
          yoyo: true,
          ease: "none",
        });
      }, index * 120);

      timeoutsRef.current.push(timeoutId);
    });
  }, [initializeParticles]);

  useEffect(() => {
    if (disableAnimations || !cardRef.current) return;

    const el = cardRef.current;

    const enter = () => {
      isHoveredRef.current = true;
      animateParticles();
    };

    const leave = () => {
      isHoveredRef.current = false;
      clearAllParticles();

      // RESET TILT
      if (enableTilt) {
        gsap.to(el, {
          rotateX: 0,
          rotateY: 0,
          duration: 0.3,
          ease: "power2.out",
        });
      }
    };

    const move = (e) => {
      if (!enableTilt) return;

      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = ((y - centerY) / centerY) * -10;
      const rotateY = ((x - centerX) / centerX) * 10;

      gsap.to(el, {
        rotateX,
        rotateY,
        duration: 0.1,
        ease: "power2.out",
        transformPerspective: 1000,
      });
    };

    el.addEventListener("mouseenter", enter);
    el.addEventListener("mouseleave", leave);
    el.addEventListener("mousemove", move);

    return () => {
      el.removeEventListener("mouseenter", enter);
      el.removeEventListener("mouseleave", leave);
      el.removeEventListener("mousemove", move);
    };
  }, [animateParticles, clearAllParticles, disableAnimations, enableTilt]);

  return (
    <div ref={cardRef} className={className} style={style}>
      {children}
    </div>
  );
};

<style>
{`
  .bento-section {
    --purple-primary: rgba(${DEFAULT_GLOW_COLOR}, 1);
    --purple-glow: rgba(${DEFAULT_GLOW_COLOR}, 0.2);
    --purple-border: rgba(${DEFAULT_GLOW_COLOR}, 0.8);
  }

  .card--border-glow::after {
    background: radial-gradient(
      var(--glow-radius) circle at var(--glow-x) var(--glow-y),
      rgba(${DEFAULT_GLOW_COLOR}, calc(var(--glow-intensity) * 0.8)) 0%,
      rgba(${DEFAULT_GLOW_COLOR}, calc(var(--glow-intensity) * 0.4)) 30%,
      transparent 60%
    );
  }

  .particle::before {
    background: rgba(${DEFAULT_GLOW_COLOR}, 0.2);
  }
`}
</style>

/* -------------------------------------------
   Spotlight Logic
-------------------------------------------- */

const GlobalSpotlight = ({ gridRef, glowColor }) => {
  const spotlightRef = useRef(null);

  useEffect(() => {
    const spotlight = document.createElement("div");
    spotlight.className = "global-spotlight";
    spotlight.style.cssText = `
      position:fixed;width:800px;height:800px;border-radius:50%;
      pointer-events:none;mix-blend-mode:screen;opacity:0;
      background:radial-gradient(circle,
        rgba(${glowColor},0.15) 0%,
        rgba(${glowColor},0.05) 30%,
        transparent 70%
      );
      transform:translate(-50%, -50%);
      z-index:200;
    `;
    document.body.appendChild(spotlight);
    spotlightRef.current = spotlight;

    const move = (e) => {
      if (!gridRef.current) return;
      const rect = gridRef.current.getBoundingClientRect();
      const inside =
        e.clientX > rect.left &&
        e.clientX < rect.right &&
        e.clientY > rect.top &&
        e.clientY < rect.bottom;

      gsap.to(spotlight, {
        left: e.clientX,
        top: e.clientY,
        opacity: inside ? 0.7 : 0,
        duration: 0.2,
      });
    };

    document.addEventListener("mousemove", move);

    return () => {
      document.removeEventListener("mousemove", move);
      spotlight.remove();
    };
  }, [gridRef, glowColor]);

  return null;
};

/* -------------------------------------------
   Container Grid Wrapper
-------------------------------------------- */

const BentoCardGrid = ({ children, gridRef }) => (
  <div
    className="bento-section grid gap-10 w-full max-w-6xl mx-auto"
    ref={gridRef}
  >
    {children}
  </div>
);

/* -------------------------------------------
   Main Magic Bento (Testimonials)
-------------------------------------------- */

const MagicBento_Testimonials = () => {
  const gridRef = useRef(null);

  return (
    <>
      <GlobalSpotlight gridRef={gridRef} glowColor={DEFAULT_GLOW_COLOR} />

      <BentoCardGrid gridRef={gridRef}>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-10 w-full justify-items-center">
          {cardData.map((c, i) => {
            const cardStyle = {
              backgroundColor: "rgba(0,0,0,0.25)",
              borderColor: "rgba(255,255,255,0.1)",
            };

            return (
              <ParticleCard
                key={i}
                className="card min-h-[260px] w-full max-w-[26rem] p-8 rounded-[24px] 
                  bg-black/20 backdrop-blur-xl border border-white/10 
                  flex flex-col items-start text-left gap-6"
                style={cardStyle}
              >
                {/* ⭐ Stars */}
                <div className="flex gap-1">
                  {Array.from({ length: c.stars }).map((_, idx) => (
                    <span key={idx} className="text-yellow-400 text-xl">★</span>
                  ))}
                </div>

                {/* Quote */}
                <p className="text-gray-200 text-[15px] leading-relaxed">
                  “{c.quote}”
                </p>

                {/* Name + Role */}
                <div>
                  <p className="font-semibold text-white">{c.name}</p>
                  <p className="text-gray-400 text-sm">{c.role}</p>
                </div>
              </ParticleCard>
            );
          })}
        </div>
      </BentoCardGrid>
    </>
  );
};

export default MagicBento_Testimonials;
