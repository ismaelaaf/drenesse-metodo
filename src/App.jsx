import {
  ArrowRight,
  Award,
  Building2,
  CalendarCheck,
  Check,
  Clock,
  HeartHandshake,
  Instagram,
  Leaf,
  Loader2,
  Lock,
  MapPin,
  MessageCircle,
  Microscope,
  Phone,
  RefreshCw,
  Sparkles,
  Stethoscope,
  Star,
  TimerReset,
  UserRound,
  UsersRound,
  Zap,
  X
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Autoplay, EffectCoverflow, Navigation, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/effect-coverflow";
import "swiper/css/navigation";
import "swiper/css/pagination";
import {
  FORM_STEPS,
  OBJECTIVES,
  PROMOTION,
  UNITS,
  WORK_ROUTINES,
  buildWhatsAppUrl,
  formatLongDate,
  formatPhone,
  getObjective,
  getUnit,
  getWorkRoutine,
  normalizeBrazilianMobile,
  validateMobile
} from "./lib/domain.js";
import { RESULTS } from "./lib/results.js";
import { pushLeadTypebotEvent } from "./lib/tracking.js";

const INITIAL_FORM = {
  name: "",
  phone: "",
  unitCode: "",
  objectiveId: "",
  workRoutineId: "",
  slot: null
};

const COUNTDOWN_SECONDS = 5 * 60 + 22;
const RESULTS_AUTOPLAY_DELAY = 3000;
const WHATSAPP_NUMBER = "5584988307853";
const INSTAGRAM_URL = "https://www.instagram.com/esteticadrenesseoficial/";
const EMPTY_AVAILABILITY_META = {
  startDate: "",
  endDate: "",
  partial: false,
  failedDates: []
};
const GENERAL_WHATSAPP_URL = buildWhatsAppUrl({
  number: WHATSAPP_NUMBER,
  reason: "general-contact"
});

const VALUE_CARDS = [
  {
    icon: Stethoscope,
    title: "Avaliação com olhar integral",
    text: "Entendemos seu objetivo, histórico e rotina antes de indicar qualquer protocolo."
  },
  {
    icon: Sparkles,
    title: "Procedimentos exclusivos",
    text: "Tecnologias e métodos próprios para cuidar de corpo, face e evolução estética."
  },
  {
    icon: HeartHandshake,
    title: "Experiência humanizada",
    text: "Acolhimento, segurança e acompanhamento para você se sentir bem em todo o processo."
  }
];

const EXPERIENCE_POINTS = [
  "Equipe multidisciplinar com visão para o todo.",
  "Plano individualizado para a sua evolução contínua.",
  "Ambiente seguro, acolhedor e focado em resultado natural."
];

const REVIEWS = [
  {
    name: "Tatiane Lourenço",
    meta: "8 avaliações · 6 anos atrás",
    rating: 5,
    avatar: "/assets/review-tatiane.webp",
    text:
      "Fiz um protocolo totalmente personalizado para minha queixa e meus hábitos. Desde a primeira conversa senti confiança de que tudo iria dar certo."
  },
  {
    name: "alexsandra assis",
    meta: "2 avaliações · um ano atrás",
    rating: 5,
    avatar: "/assets/review-alexsandra.webp",
    text: "Uma experiência maravilhosa!! O atendimento ótimo, as meninas são bem atenciosas! Amei conhecer a clínica de Lagoa Nova."
  },
  {
    name: "Eliane A. Rocha",
    meta: "Local Guide · 4 anos atrás",
    rating: 5,
    avatar: "/assets/review-eliane.webp",
    text: "As meninas lá são extremamente educadas e prestativas. A massagem de drenagem é fantástica. O chá é uma delícia. Muito bom."
  }
];

const PROOF_STATS = [
  { icon: Star, value: "4,6", label: "avaliação no Google" },
  { icon: UsersRound, value: "+15 mil", label: "pacientes atendidos" },
  { icon: Sparkles, value: "+40", label: "procedimentos" },
  { icon: Building2, value: "4", label: "unidades em Natal/RN" }
];

const MOCKUP_VALUE_CARDS = [
  {
    icon: Leaf,
    title: "Protocolos exclusivos",
    text: "Métodos desenvolvidos pela Drenesse para resultados comprovados."
  },
  {
    icon: Microscope,
    title: "Tecnologia avançada",
    text: "Equipamentos de última geração aliados à ciência e inovação."
  },
  {
    icon: Stethoscope,
    title: "Abordagem integral",
    text: "Corpo, rosto e bem-estar com olhar individualizado e humanizado."
  },
  {
    icon: UsersRound,
    title: "Equipe multidisciplinar",
    text: "Profissionais especialistas em diversas áreas da estética."
  },
  {
    icon: HeartHandshake,
    title: "Acompanhamento contínuo",
    text: "Estamos ao seu lado em cada etapa da sua jornada de transformação."
  }
];

const TEAM_POINTS = [
  "Profissionais altamente qualificados",
  "Atendimento humanizado e individualizado",
  "Foco na sua evolução contínua",
  "Segurança e acolhimento em cada etapa"
];

function todayIso() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date.toISOString().slice(0, 10);
}

function formatCountdown(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function useCountdown(initialSeconds) {
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSeconds((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  return formatCountdown(seconds);
}

function useScrollReveal() {
  useEffect(() => {
    const elements = Array.from(document.querySelectorAll("[data-reveal]"));
    if (!elements.length) return;

    if (!("IntersectionObserver" in window)) {
      elements.forEach((element) => element.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.16 }
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);
}

function useScrollMotion() {
  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const elements = Array.from(document.querySelectorAll("[data-motion]"));
    if (!elements.length || motionQuery.matches) return undefined;

    let frame = 0;

    function update() {
      frame = 0;
      const viewport = window.innerHeight || 1;

      elements.forEach((element) => {
        const rect = element.getBoundingClientRect();
        const progress = Math.min(1, Math.max(0, (viewport - rect.top) / (viewport + rect.height)));
        const y = (progress - 0.5) * -42;
        const scale = 1.055 - progress * 0.045;

        element.style.setProperty("--motion-progress", progress.toFixed(3));
        element.style.setProperty("--motion-y", `${y.toFixed(2)}px`);
        element.style.setProperty("--motion-scale", scale.toFixed(3));
      });
    }

    function requestUpdate() {
      if (!frame) frame = window.requestAnimationFrame(update);
    }

    update();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, []);
}

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(query.matches);

    updatePreference();
    query.addEventListener("change", updatePreference);
    return () => query.removeEventListener("change", updatePreference);
  }, []);

  return prefersReducedMotion;
}

function getTrackingPayload() {
  const params = new URLSearchParams(window.location.search);
  const keys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
  return keys.reduce(
    (acc, key) => {
      const value = params.get(key);
      if (value) acc[key] = value;
      return acc;
    },
    {
      page: window.location.href,
      referrer: document.referrer || ""
    }
  );
}

export default function App() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [availability, setAvailability] = useState([]);
  const [availabilityState, setAvailabilityState] = useState("idle");
  const [availabilityMeta, setAvailabilityMeta] = useState(EMPTY_AVAILABILITY_META);
  const [availabilityAttempt, setAvailabilityAttempt] = useState(0);
  const [submitState, setSubmitState] = useState("idle");
  const [result, setResult] = useState(null);
  const capturedLeadKeysRef = useRef(new Set());
  const trackedLeadKeysRef = useRef(new Set());

  const selectedUnit = useMemo(() => getUnit(form.unitCode), [form.unitCode]);
  const selectedObjective = useMemo(() => getObjective(form.objectiveId), [form.objectiveId]);
  const selectedWorkRoutine = useMemo(() => getWorkRoutine(form.workRoutineId), [form.workRoutineId]);
  const countdown = useCountdown(COUNTDOWN_SECONDS);
  useScrollReveal();
  useScrollMotion();

  useEffect(() => {
    if (step !== 4 || !form.unitCode) return;
    const controller = new AbortController();
    setAvailabilityState("loading");
    setAvailability([]);
    setAvailabilityMeta(EMPTY_AVAILABILITY_META);
    setError("");
    fetch(`/api/availability?unit=${form.unitCode}&date=${todayIso()}`, {
      signal: controller.signal
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          const requestError = new Error(data.message || "Não foi possível consultar horários.");
          requestError.availabilityMeta = data;
          throw requestError;
        }
        setAvailability(data.days || []);
        setAvailabilityMeta({
          startDate: data.startDate || "",
          endDate: data.endDate || "",
          partial: Boolean(data.partial),
          failedDates: data.failedDates || []
        });
        setAvailabilityState("success");
      })
      .catch((requestError) => {
        if (requestError.name === "AbortError") return;
        setAvailability([]);
        setAvailabilityMeta({
          startDate: requestError.availabilityMeta?.startDate || "",
          endDate: requestError.availabilityMeta?.endDate || "",
          partial: false,
          failedDates: requestError.availabilityMeta?.failedDates || []
        });
        setAvailabilityState("error");
      });

    return () => controller.abort();
  }, [step, form.unitCode, availabilityAttempt]);

  const progress = ((step + 1) / FORM_STEPS.length) * 100;

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(["unitCode", "objectiveId", "workRoutineId"].includes(field) ? { slot: null } : {})
    }));
    if (field === "unitCode") {
      setAvailability([]);
      setAvailabilityState("idle");
      setAvailabilityMeta(EMPTY_AVAILABILITY_META);
    }
    setError("");
  }

  function validateStep(currentStep = step) {
    if (currentStep === 0) {
      if (form.name.trim().length < 2) return "Digite seu nome para continuar.";
      const phoneError = validateMobile(form.phone);
      if (phoneError) return phoneError;
    }
    if (currentStep === 1 && !selectedUnit) return "Escolha a unidade de preferência.";
    if (currentStep === 2 && !selectedObjective) return "Escolha o objetivo do atendimento.";
    if (currentStep === 3 && !selectedWorkRoutine) return "Escolha como você trabalha.";
    if (currentStep === 4 && !form.slot) return "Escolha um horário disponível.";
    return "";
  }

  function nextStep() {
    const validation = validateStep();
    if (validation) {
      setError(validation);
      return;
    }
    setError("");
    if (step === 0) {
      const phone = normalizeBrazilianMobile(form.phone);
      const captureKey = phone;
      if (!capturedLeadKeysRef.current.has(captureKey)) {
        capturedLeadKeysRef.current.add(captureKey);
        fetch("/api/capture-lead", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: form.name.trim(), phone }),
          keepalive: true
        })
          .then((response) => {
            if (!response.ok) capturedLeadKeysRef.current.delete(captureKey);
          })
          .catch(() => capturedLeadKeysRef.current.delete(captureKey));
      }
    }
    setStep((current) => Math.min(current + 1, FORM_STEPS.length - 1));
  }

  function previousStep() {
    setError("");
    setStep((current) => Math.max(current - 1, 0));
  }

  function retryAvailability() {
    setAvailabilityAttempt((current) => current + 1);
  }

  async function submitBooking(event) {
    event.preventDefault();
    const validation = validateStep(FORM_STEPS.length - 1);
    if (validation) {
      setError(validation);
      return;
    }

    setSubmitState("loading");
    setError("");

    const payload = {
      name: form.name.trim(),
      phone: normalizeBrazilianMobile(form.phone),
      unitCode: Number(form.unitCode),
      objectiveId: form.objectiveId,
      workRoutineId: form.workRoutineId,
      slot: form.slot,
      tracking: getTrackingPayload()
    };
    const trackingKey = payload.phone;
    if (!trackedLeadKeysRef.current.has(trackingKey)) {
      pushLeadTypebotEvent(payload);
      trackedLeadKeysRef.current.add(trackingKey);
    }

    try {
      const response = await fetch("/api/submit-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json().catch(() => ({}));
      if (data.bookingStatus === "ineligible") {
        setResult(data);
        setSubmitState("ineligible");
        window.setTimeout(() => {
          if (data.whatsappUrl) window.location.href = data.whatsappUrl;
        }, 2400);
        return;
      }
      if (!response.ok) throw new Error(data.message || "Não foi possível concluir agora.");
      setResult(data);
      setSubmitState("success");
      window.setTimeout(() => {
        window.location.href =
          data.whatsappUrl ||
          buildWhatsAppUrl({
            number: WHATSAPP_NUMBER,
            name: payload.name,
            phone: payload.phone,
            unit: selectedUnit,
            objective: selectedObjective,
            workRoutine: selectedWorkRoutine,
            slot: payload.slot,
            bookingStatus: "fallback"
          });
      }, 1800);
    } catch (submitError) {
      setSubmitState("error");
      setError(submitError.message || "Não foi possível concluir agora.");
    }
  }

  return (
    <main>
      <Header />
      <section className="hero" data-reveal id="inicio">
        <div className="hero__content">
          <div className="hero__copy">
            <div className="promo-alerts" aria-label="Promoção relâmpago, últimas vagas">
              <div className="promo-flash">
                <Zap aria-hidden="true" size={24} />
                PROMOÇÃO RELÂMPAGO
              </div>
              <div className="promo-last-spots">ÚLTIMAS VAGAS</div>
            </div>
            <h1 className="display-title hero-title">
              Método <span>Drenesse</span>
            </h1>
            <p className="hero-tagline">A MELHOR DRENAGEM DO MUNDO</p>
            <p className="hero-emphasis">PERCA ATÉ 3 KG EM UMA ÚNICA SESSÃO</p>

            <div className="promo-price" aria-label={`De ${PROMOTION.regularPrice} por ${PROMOTION.promotionalPrice}`}>
              <span className="promo-price__was">DE <s>{PROMOTION.regularPrice}</s></span>
              <div className="promo-price__now">
                <small>POR</small>
                <strong>{PROMOTION.promotionalPrice}</strong>
              </div>
              <span className="promo-price__service">Método Drenesse · sessão de {PROMOTION.duration} minutos</span>
            </div>

            <div className="hero-scarcity-line">
              <UsersRound aria-hidden="true" size={18} />
              <span>Condição limitada</span>
              <i aria-hidden="true" />
              <span>Às vagas disponíveis</span>
            </div>

            <div className="hero-actions">
              <CountdownBoard countdown={countdown} />
              <a className="primary-button primary-button--hero" href="#formulario">
                <CalendarCheck aria-hidden="true" size={19} />
                <span className="hero-cta-label hero-cta-label--full">
                  GARANTIR AGORA POR {PROMOTION.promotionalPrice}
                </span>
                <span className="hero-cta-label hero-cta-label--compact">
                  GARANTIR POR {PROMOTION.promotionalPrice}
                </span>
                <ArrowRight aria-hidden="true" size={18} />
              </a>
            </div>
            <p className="promo-disclaimer">
              Resultados variam conforme avaliação individual. <span>O site não realiza cobranças.</span>
            </p>
          </div>

          <HeroMedia />
        </div>
      </section>

      <AuthorityBand />
      <ValueSection />
      <ClinicShowcaseSection />
      <ExperienceSection />
      <ResultsCarousel />

      <section className="booking-section" data-reveal id="formulario">
        <div className="booking-copy">
          <div className="section-kicker">Prova social</div>
          <h2 className="display-title">Quem vive, <span>recomenda</span></h2>
          <p>Escolha sua unidade e o melhor horário para garantir a condição da campanha.</p>
          <article className="review-card review-card--featured" data-reveal>
            <div className="review-card__person">
              <img src={REVIEWS[0].avatar} alt={`Foto de ${REVIEWS[0].name}`} />
              <div>
                <strong>{REVIEWS[0].name}</strong>
                <span>{REVIEWS[0].meta}</span>
              </div>
            </div>
            <Stars rating={REVIEWS[0].rating} />
            <p>“{REVIEWS[0].text}”</p>
          </article>
          <CountdownPill countdown={countdown} compact />
        </div>
        <LeadForm
          availability={availability}
          availabilityMeta={availabilityMeta}
          availabilityState={availabilityState}
          error={error}
          form={form}
          nextStep={nextStep}
          previousStep={previousStep}
          progress={progress}
          retryAvailability={retryAvailability}
          result={result}
          selectedObjective={selectedObjective}
          selectedUnit={selectedUnit}
          selectedWorkRoutine={selectedWorkRoutine}
          setStep={setStep}
          step={step}
          submitBooking={submitBooking}
          submitState={submitState}
          updateField={updateField}
        />
      </section>
      <SiteFooter />
    </main>
  );
}

function CountdownBoard({ countdown }) {
  const [minutes, seconds] = countdown.split(":");

  return (
    <div className="countdown-board" aria-live="polite">
      <span>condição reservada por</span>
      <div>
        <strong>{minutes}</strong>
        <b aria-hidden="true">:</b>
        <strong>{seconds}</strong>
      </div>
      <footer>
        <small>minutos</small>
        <small>segundos</small>
      </footer>
    </div>
  );
}

function CountdownPill({ compact = false, countdown }) {
  return (
    <div className={compact ? "countdown-pill countdown-pill--compact" : "countdown-pill"} aria-live="polite">
      <TimerReset aria-hidden="true" size={18} />
      <span>Tempo da condição</span>
      <strong>{countdown}</strong>
    </div>
  );
}

function HeroMedia() {
  return (
    <aside className="hero-media hero-result" aria-label="Resultado real do Método Drenesse">
      <img
        aria-hidden="true"
        className="hero-result__ambient"
        src="/assets/metodo-drenesse-resultado.webp"
      />
      <figure className="hero-result__frame" data-motion>
        <span className="hero-result__badge">RESULTADO REAL</span>
        <span className="hero-result__label hero-result__label--before">Antes</span>
        <img
          className="hero-result__photo"
          src="/assets/metodo-drenesse-resultado.webp"
          alt="Resultado real antes e depois do Método Drenesse"
        />
        <span className="hero-result__label hero-result__label--after">Depois</span>
      </figure>
    </aside>
  );
}

function AuthorityBand() {
  return (
    <section className="authority-band" aria-label="Autoridade Drenesse">
      <Award aria-hidden="true" size={30} />
      <p>
        <strong>Método exclusivo Drenesse</strong>
        <span>da maior clínica de estética do Rio Grande do Norte.</span>
      </p>
      <a href="#formulario">
        Garantir a oferta
        <ArrowRight aria-hidden="true" size={18} />
      </a>
    </section>
  );
}

function ValueSection() {
  return (
    <section className="value-section" data-reveal aria-labelledby="value-title">
      <div className="section-kicker">Por que escolher a Drenesse</div>
      <div className="section-heading--plain value-heading">
        <h2 className="display-title" id="value-title">
          Tecnologia, método e cuidado <span>para resultados reais</span>
        </h2>
      </div>

      <div className="value-grid">
        {MOCKUP_VALUE_CARDS.map(({ icon: Icon, title, text }) => (
          <article className="value-card" data-reveal key={title}>
            <Icon aria-hidden="true" size={26} />
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function ClinicShowcaseSection() {
  return (
    <section className="clinic-showcase" data-reveal aria-labelledby="clinic-title">
      <div className="clinic-visual" data-motion>
        <img src="/assets/drenesse-unidade.webp" alt="Recepção da unidade Drenesse" />
      </div>

      <div className="clinic-copy">
        <div className="section-kicker">A experiência Drenesse</div>
        <h2 className="display-title" id="clinic-title">
          Um espaço feito para acolher e <span>transformar você</span>
        </h2>
        <p>
          Ambientes modernos, confortáveis e pensados para proporcionar bem-estar em cada detalhe da sua experiência.
        </p>
        <div className="clinic-units-panel">
          <strong>4 unidades em Natal/RN</strong>
          <div className="clinic-units-grid">
            {UNITS.map((unit) => (
              <div className="clinic-unit" key={unit.code}>
                <MapPin aria-hidden="true" size={16} />
                <span>
                  <b>{unit.shortName}</b>
                  <small>{unit.address}</small>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ExperienceSection() {
  return (
    <section className="experience-section" data-reveal aria-labelledby="experience-title">
      <div className="video-frame">
        <video
          aria-hidden="true"
          autoPlay
          className="video-frame__ambient"
          loop
          muted
          playsInline
          preload="metadata"
          src="/assets/drenesse-equipe-silent.mp4"
          tabIndex={-1}
        />
        <video
          autoPlay
          className="video-frame__main"
          loop
          muted
          playsInline
          preload="metadata"
          src="/assets/drenesse-equipe-silent.mp4"
        >
          Seu navegador não suporta vídeo HTML5.
        </video>
        <div className="video-frame__label">
          <span>Time que cuida de você</span>
          <strong>Excelência que você sente</strong>
        </div>
      </div>

      <div className="experience-copy">
        <div className="section-kicker">Quem faz a Drenesse</div>
        <h2 className="display-title" id="experience-title">
          Cuidado que vai <span>além da estética</span>
        </h2>
        <p>
          Aqui você encontra uma equipe multidisciplinar preparada para cuidar de você por inteiro.
        </p>
        <ul>
          {TEAM_POINTS.map((point) => (
            <li key={point}>
              <Check aria-hidden="true" size={17} />
              {point}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function ResultsCarousel() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const carouselResults = useMemo(() => {
    const minimumSlidesForLoop = 6;
    const totalSlides = RESULTS.length >= minimumSlidesForLoop ? RESULTS.length : minimumSlidesForLoop;

    return Array.from({ length: totalSlides }, (_, index) => ({
      ...RESULTS[index % RESULTS.length],
      displayIndex: index
    }));
  }, []);
  const [activeIndex, setActiveIndex] = useState(0);
  const [swiper, setSwiper] = useState(null);
  const [carouselPaused, setCarouselPaused] = useState(false);
  const [lightboxResult, setLightboxResult] = useState(null);
  const lastAdvanceRef = useRef({ index: 0, changedAt: Date.now() });

  useEffect(() => {
    if (!lightboxResult) return undefined;

    const previousOverflow = document.body.style.overflow;
    const handleKeydown = (event) => {
      if (event.key === "Escape") setLightboxResult(null);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeydown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeydown);
    };
  }, [lightboxResult]);

  useEffect(() => {
    lastAdvanceRef.current = { index: activeIndex, changedAt: Date.now() };
  }, [activeIndex]);

  useEffect(() => {
    if (!swiper || prefersReducedMotion || carouselPaused) return undefined;

    swiper.autoplay?.start?.();

    const watchdog = window.setInterval(() => {
      if (document.hidden) return;

      const elapsed = Date.now() - lastAdvanceRef.current.changedAt;
      if (elapsed < RESULTS_AUTOPLAY_DELAY + 400) return;

      swiper.slideNext();
      lastAdvanceRef.current = { index: swiper.realIndex, changedAt: Date.now() };
    }, 500);

    return () => window.clearInterval(watchdog);
  }, [swiper, prefersReducedMotion, carouselPaused]);

  function handleResultClick(result, index) {
    if (index === activeIndex) {
      setLightboxResult(result);
      return;
    }

    swiper?.slideToLoop(index);
  }

  return (
    <section className="results-section" data-reveal aria-labelledby="results-title">
      <div className="section-kicker">Resultados reais</div>
      <div className="section-heading--plain">
        <h2 className="display-title" id="results-title">
          Antes e depois para ver <span>a transformação de perto</span>
        </h2>
        <p>Registros visuais de evoluções acompanhadas pela equipe Drenesse.</p>
      </div>

      <div
        className="results-carousel-shell"
        onMouseEnter={() => {
          setCarouselPaused(true);
          swiper?.autoplay?.pause?.();
        }}
        onMouseLeave={() => {
          setCarouselPaused(false);
          swiper?.autoplay?.resume?.();
        }}
      >
        <Swiper
          autoplay={
            prefersReducedMotion
              ? false
              : {
                  delay: RESULTS_AUTOPLAY_DELAY,
                  disableOnInteraction: false,
                  pauseOnMouseEnter: true
                }
          }
          breakpoints={{
            0: { spaceBetween: 10 },
            680: { spaceBetween: 18 },
            1024: { spaceBetween: 26 }
          }}
          centeredSlides
          className="results-swiper"
          coverflowEffect={{
            rotate: 0,
            stretch: 0,
            depth: prefersReducedMotion ? 0 : 170,
            modifier: 1.18,
            slideShadows: false
          }}
          effect={prefersReducedMotion ? "slide" : "coverflow"}
          grabCursor
          loop={carouselResults.length > 2}
          modules={[EffectCoverflow, Autoplay, Navigation, Pagination]}
          navigation={{
            nextEl: ".results-nav--next",
            prevEl: ".results-nav--prev"
          }}
          onSlideChange={(instance) => setActiveIndex(instance.realIndex)}
          onSwiper={(instance) => {
            setSwiper(instance);
            setActiveIndex(instance.realIndex);
          }}
          pagination={{ clickable: true }}
          slidesPerView="auto"
          speed={780}
        >
          {carouselResults.map((result, index) => {
            const isActive = index === activeIndex;
            return (
              <SwiperSlide className="results-slide" key={`${result.image}-${result.displayIndex}`}>
                <button
                  aria-label={isActive ? `Ampliar ${result.alt}` : `Ver ${result.alt}`}
                  className={isActive ? "result-card result-card--active" : "result-card"}
                  onClick={() => handleResultClick(result, index)}
                  type="button"
                >
                  <img alt={result.alt} loading={index === 0 ? "eager" : "lazy"} src={result.image} />
                </button>
              </SwiperSlide>
            );
          })}
        </Swiper>

        <button className="results-nav results-nav--prev" type="button" aria-label="Resultado anterior">
          <ArrowRight aria-hidden="true" size={20} />
        </button>
        <button className="results-nav results-nav--next" type="button" aria-label="Próximo resultado">
          <ArrowRight aria-hidden="true" size={20} />
        </button>
      </div>

      {lightboxResult &&
        createPortal(
        <div
          aria-labelledby="results-lightbox-title"
          aria-modal="true"
          className="results-lightbox"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setLightboxResult(null);
          }}
          role="dialog"
        >
          <div className="results-lightbox__panel">
            <button
              aria-label="Fechar imagem ampliada"
              className="results-lightbox__close"
              onClick={() => setLightboxResult(null)}
              type="button"
            >
              <X aria-hidden="true" size={22} />
            </button>
            <h3 className="sr-only" id="results-lightbox-title">
              Resultado ampliado
            </h3>
            <img alt={lightboxResult.alt} src={lightboxResult.image} />
          </div>
        </div>,
          document.body
        )}
    </section>
  );
}

function GoogleProofSection() {
  return (
    <section className="proof-section" data-reveal aria-labelledby="proof-title">
      <div className="section-kicker">Prova social</div>
      <div className="section-heading--plain">
        <h2 className="display-title" id="proof-title">
          Quem vive a experiência <span>recomenda a Drenesse</span>
        </h2>
        <p>O próximo passo é entender qual protocolo faz sentido para você.</p>
      </div>

      <div className="stats-grid">
        {PROOF_STATS.map(({ icon: Icon, value, label }) => (
          <article className="stat-card" data-reveal key={label}>
            <Icon aria-hidden="true" size={24} />
            <strong>{value}</strong>
            <span>{label}</span>
          </article>
        ))}
      </div>

      <div className="review-strip" aria-label="Resumo de avaliações do Google">
        {REVIEWS.map((review) => (
          <article className="review-card" data-reveal key={review.name}>
            <div className="review-card__person">
              <img src={review.avatar} alt={`Foto de ${review.name}`} />
              <div>
                <strong>{review.name}</strong>
                <span>{review.meta}</span>
              </div>
            </div>
            <Stars rating={review.rating} />
            <p>“{review.text}”</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function Stars({ rating }) {
  return (
    <div aria-label={`${rating} de 5 estrelas`} className="stars">
      {"★".repeat(rating)}
    </div>
  );
}

function UnitsSection() {
  return (
    <section className="units-section" data-reveal aria-labelledby="units-title">
      <div className="section-heading">
        <span />
        <h2 className="display-title" id="units-title">
          Escolha a Drenesse mais próxima em <strong>Natal/RN</strong>
        </h2>
        <span />
      </div>
      <div className="units-grid">
        {UNITS.map((unit) => (
          <article className="unit-card" data-reveal key={unit.code}>
            <div className="unit-card__pin">
              <MapPin aria-hidden="true" size={18} />
            </div>
            <h3>{unit.name}</h3>
            <p>{unit.address}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function Header() {
  return (
    <header className="site-header">
      <a className="brand" href="#inicio" aria-label="Drenesse">
        <img src="/assets/logo-drenesse.webp" alt="Drenesse" />
      </a>
      <a className="header-cta" href="#formulario">
        Garantir oferta
      </a>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__copy">
        <strong>Drenesse</strong>
        <span>Cuidado, tecnologia e acolhimento para a sua evolução.</span>
      </div>
      <nav className="site-footer__social" aria-label="Redes sociais e atendimento">
        <a href={INSTAGRAM_URL} rel="noreferrer" target="_blank">
          <Instagram aria-hidden="true" size={19} />
          Instagram
        </a>
        <a href={GENERAL_WHATSAPP_URL} rel="noreferrer" target="_blank">
          <MessageCircle aria-hidden="true" size={19} />
          WhatsApp
        </a>
      </nav>
    </footer>
  );
}

function LeadForm({
  availability,
  availabilityMeta,
  availabilityState,
  error,
  form,
  nextStep,
  previousStep,
  progress,
  retryAvailability,
  result,
  selectedObjective,
  selectedUnit,
  selectedWorkRoutine,
  setStep,
  step,
  submitBooking,
  submitState,
  updateField
}) {
  const currentStep = FORM_STEPS[step];
  const isFinalStep = step === FORM_STEPS.length - 1;
  const hasAvailableSlots = availability.some((day) => (day.slots || []).length > 0);
  const showAvailabilityFallback =
    isFinalStep &&
    !hasAvailableSlots &&
    (availabilityState === "success" || availabilityState === "error");
  const fallbackReason =
    availabilityState === "error"
      ? "availability-error"
      : availabilityMeta.partial
        ? "availability-partial"
        : "no-availability";
  const availabilityWhatsappUrl = buildWhatsAppUrl({
    number: WHATSAPP_NUMBER,
    name: form.name.trim(),
    phone: normalizeBrazilianMobile(form.phone),
    unit: selectedUnit,
    objective: selectedObjective,
    workRoutine: selectedWorkRoutine,
    reason: fallbackReason,
    range: availabilityMeta
  });
  const submitDisabled = submitState === "loading" || !form.slot;

  if (submitState === "ineligible") {
    return (
      <section className="form-card form-card--success form-card--ineligible" aria-live="polite">
        <div className="success-mark">
          <HeartHandshake aria-hidden="true" size={28} />
        </div>
        <h2>Você já aproveitou este benefício</h2>
        <p>
          Encontramos este WhatsApp em nosso cadastro, então esta condição especial não pode ser utilizada novamente.
          Nossa equipe terá prazer em apresentar outras opções do Método Drenesse.
        </p>
        <p className="redirect-note">Estamos te encaminhando para o atendimento pelo WhatsApp.</p>
        {result?.whatsappUrl && (
          <a className="primary-button" href={result.whatsappUrl}>
            <MessageCircle aria-hidden="true" size={18} />
            Falar com atendimento
          </a>
        )}
      </section>
    );
  }

  if (submitState === "success") {
    return (
      <section className="form-card form-card--success" aria-live="polite">
        <div className="success-mark">
          <Check aria-hidden="true" size={28} />
        </div>
        <h2>{result?.bookingStatus === "confirmed" ? "Sessão solicitada" : "Pedido recebido"}</h2>
        <p>
          Já estamos te encaminhando para o WhatsApp da equipe Drenesse para confirmar os detalhes.
        </p>
        {result?.whatsappUrl && (
          <a className="primary-button" href={result.whatsappUrl}>
            Abrir WhatsApp
          </a>
        )}
      </section>
    );
  }

  return (
    <form className="form-card" onSubmit={submitBooking}>
      <div className="progress-block">
        <div className="progress-copy">
          <span>
            Etapa {step + 1} de {FORM_STEPS.length} - {currentStep.label}
          </span>
          <span>leva menos de 1 minuto</span>
        </div>
        <div className="progress-track" aria-hidden="true">
          <span style={{ width: `${progress}%` }} />
        </div>
      </div>

      <StepNav step={step} setStep={setStep} form={form} />

      <div className="step-body">
        {step === 0 && <DataStep form={form} updateField={updateField} />}
        {step === 1 && <UnitStep form={form} updateField={updateField} />}
        {step === 2 && <ObjectiveStep form={form} updateField={updateField} />}
        {step === 3 && <RoutineStep form={form} updateField={updateField} />}
        {step === 4 && (
          <ScheduleStep
            availability={availability}
            availabilityMeta={availabilityMeta}
            availabilityState={availabilityState}
            form={form}
            selectedObjective={selectedObjective}
            selectedUnit={selectedUnit}
            selectedWorkRoutine={selectedWorkRoutine}
            retryAvailability={retryAvailability}
            updateField={updateField}
          />
        )}
      </div>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <div className={showAvailabilityFallback ? "form-actions form-actions--fallback" : "form-actions"}>
        {step > 0 && (
          <button className="ghost-button" type="button" onClick={previousStep}>
            Voltar
          </button>
        )}
        {isFinalStep ? (
          availabilityState === "loading" || availabilityState === "idle" ? (
            <button className="primary-button" type="button" disabled>
              <Loader2 aria-hidden="true" className="spin" size={18} />
              Verificando 6 dias
            </button>
          ) : showAvailabilityFallback ? (
            <a
              className="primary-button"
              data-testid="availability-whatsapp"
              href={availabilityWhatsappUrl}
              rel="noreferrer"
              target="_blank"
            >
              <MessageCircle aria-hidden="true" size={18} />
              {availabilityState === "error" ? "Falar com atendimento" : "Consultar encaixe no WhatsApp"}
            </a>
          ) : (
            <button className="primary-button" data-testid="submit-button" type="submit" disabled={submitDisabled}>
              {submitState === "loading" ? (
                <>
                  <Loader2 aria-hidden="true" className="spin" size={18} />
                  Reservando sessão
                </>
              ) : (
                <>
                  <CalendarCheck aria-hidden="true" size={18} />
                  Agendar agora
                </>
              )}
            </button>
          )
        ) : (
          <button className="primary-button" data-testid="continue-button" type="button" onClick={nextStep}>
            Continuar
          </button>
        )}
      </div>

      <p className="safe-note">
        <Lock aria-hidden="true" size={14} />
        Seus dados estão seguros. Sem spam.
      </p>
    </form>
  );
}

function StepNav({ form, setStep, step }) {
  const enabledStep = [
    true,
    form.name.trim().length >= 2 && !validateMobile(form.phone),
    Boolean(form.unitCode),
    Boolean(form.objectiveId),
    Boolean(form.workRoutineId)
  ];

  return (
    <div className="step-nav" aria-label="Etapas do formulário">
      {FORM_STEPS.map((item, index) => {
        const isActive = step === index;
        const isDone = step > index;
        return (
          <button
            aria-current={isActive ? "step" : undefined}
            className={isActive ? "active" : isDone ? "done" : ""}
            disabled={!enabledStep[index]}
            key={item.key}
            onClick={() => setStep(index)}
            type="button"
          >
            <span>{isDone ? <Check aria-hidden="true" size={14} /> : index + 1}</span>
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

function DataStep({ form, updateField }) {
  const phoneDigits = normalizeBrazilianMobile(form.phone);
  const phoneOk = phoneDigits.length === 11 && !validateMobile(phoneDigits);

  return (
    <div className="field-stack">
      <label>
        <span>Nome completo</span>
        <div className="input-shell">
          <UserRound aria-hidden="true" size={20} />
          <input
            autoComplete="name"
            data-testid="name-input"
            name="name"
            onChange={(event) => updateField("name", event.target.value)}
            placeholder="Seu nome"
            type="text"
            value={form.name}
          />
        </div>
      </label>

      <label>
        <span>WhatsApp</span>
        <div className={phoneOk ? "input-shell input-shell--ok" : "input-shell"}>
          <Phone aria-hidden="true" size={20} />
          <input
            autoComplete="tel-national"
            data-testid="phone-input"
            inputMode="tel"
            maxLength={20}
            name="phone"
            onChange={(event) => updateField("phone", formatPhone(event.target.value))}
            placeholder="(84) 9 9999-9999"
            type="text"
            value={form.phone}
          />
        </div>
      </label>

      {phoneOk && (
        <p className="valid-note">
          <Check aria-hidden="true" size={16} />
          Dados conferidos. Pode continuar.
        </p>
      )}
    </div>
  );
}

function UnitStep({ form, updateField }) {
  return (
    <div className="choice-grid">
      {UNITS.map((unit) => {
        const active = Number(form.unitCode) === unit.code;
        return (
          <button
            className={active ? "choice-card choice-card--active" : "choice-card"}
            data-testid={`unit-${unit.code}`}
            key={unit.code}
            onClick={() => updateField("unitCode", String(unit.code))}
            type="button"
          >
            <span className="choice-card__icon">
              <MapPin aria-hidden="true" size={18} />
            </span>
            <strong>{unit.shortName}</strong>
            <small>{unit.address}</small>
          </button>
        );
      })}
    </div>
  );
}

function ObjectiveStep({ form, updateField }) {
  return (
    <div className="field-stack">
      <h2 className="step-title">Qual é o foco do seu atendimento?</h2>
      <div className="objective-list">
        {OBJECTIVES.map((objective) => {
          const active = form.objectiveId === objective.id;
          return (
            <button
              className={active ? "objective-option objective-option--active" : "objective-option"}
              data-testid={`objective-${objective.id}`}
              key={objective.id}
              onClick={() => updateField("objectiveId", objective.id)}
              type="button"
            >
              <span>
                <Stethoscope aria-hidden="true" size={18} />
              </span>
              <strong>{objective.title}</strong>
              <small>{objective.description}</small>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RoutineStep({ form, updateField }) {
  return (
    <div className="field-stack">
      <h2 className="step-title">Como você trabalha na maior parte do dia?</h2>
      <div className="objective-list routine-list">
        {WORK_ROUTINES.map((routine) => {
          const active = form.workRoutineId === routine.id;
          return (
            <button
              className={active ? "objective-option objective-option--active" : "objective-option"}
              data-testid={`routine-${routine.id}`}
              key={routine.id}
              onClick={() => updateField("workRoutineId", routine.id)}
              type="button"
            >
              <span>
                <UserRound aria-hidden="true" size={18} />
              </span>
              <strong>{routine.title}</strong>
              <small>{routine.description}</small>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ScheduleStep({
  availability,
  availabilityMeta,
  availabilityState,
  form,
  retryAvailability,
  selectedObjective,
  selectedUnit,
  selectedWorkRoutine,
  updateField
}) {
  const slots = availability.flatMap((day) => day.slots || []);
  const rangeText =
    availabilityMeta.startDate && availabilityMeta.endDate
      ? `${formatLongDate(availabilityMeta.startDate)} a ${formatLongDate(availabilityMeta.endDate)}`
      : "os próximos 6 dias";

  if (availabilityState === "loading" || availabilityState === "idle") {
    return (
      <div className="schedule-state">
        <Loader2 aria-hidden="true" className="spin" size={28} />
        <strong>Verificando horários dos próximos 6 dias</strong>
        <span>Estamos organizando as opções do Método Drenesse em {selectedUnit?.name}.</span>
      </div>
    );
  }

  if (availabilityState === "error") {
    return (
      <div className="schedule-state">
        <Clock aria-hidden="true" size={28} />
        <strong>A agenda online está temporariamente indisponível</strong>
        <span>Você pode tentar novamente ou falar diretamente com a equipe Drenesse.</span>
        <button className="schedule-retry" data-testid="availability-retry" onClick={retryAvailability} type="button">
          <RefreshCw aria-hidden="true" size={16} />
          Tentar novamente
        </button>
      </div>
    );
  }

  if (availabilityState === "success" && slots.length === 0) {
    return (
      <div className="schedule-state">
        <Clock aria-hidden="true" size={28} />
        <strong>
          {availabilityMeta.partial
            ? "Não conseguimos concluir toda a busca"
            : "Não encontramos horários livres nos próximos 6 dias"}
        </strong>
        <span>
          {availabilityMeta.partial
            ? "Algumas datas não responderam. A equipe pode verificar a agenda completa e possíveis encaixes."
            : `Consultamos ${rangeText}. A equipe pode verificar encaixes e novas aberturas pelo WhatsApp.`}
        </span>
        {availabilityMeta.partial && (
          <button className="schedule-retry" data-testid="availability-retry" onClick={retryAvailability} type="button">
            <RefreshCw aria-hidden="true" size={16} />
            Repetir busca
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="schedule-block">
      {availabilityMeta.partial && (
        <p className="schedule-notice" role="status">
          Exibindo os horários encontrados. Algumas datas não puderam ser verificadas agora.
        </p>
      )}
      <div className="schedule-summary">
        <span>{selectedUnit?.name}</span>
        <strong>{selectedObjective?.label}</strong>
        <small>{selectedWorkRoutine?.label}</small>
      </div>

      <div className="slot-days">
        {availability.map((day) => {
          const daySlots = day.slots || [];
          if (!daySlots.length) return null;
          return (
            <section className="slot-day" key={day.date}>
              <h3>{formatLongDate(day.date)}</h3>
              <div className="slot-list">
                {daySlots.slice(0, 18).map((slot) => {
                  const active = form.slot?.id === slot.id;
                  return (
                    <button
                      className={active ? "slot-button slot-button--active" : "slot-button"}
                      data-testid="slot-button"
                      key={slot.id}
                      onClick={() => updateField("slot", slot)}
                      type="button"
                    >
                      <strong>{slot.time}</strong>
                      <span>{slot.professionalName}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
