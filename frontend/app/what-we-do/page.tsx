import type { Metadata } from "next";
import { PageShell } from "@/components/layout";
import { PageIntro } from "@/components/ui";
import { Activity, Utensils, Users, Building2, Quote, Sparkles, ArrowRight, Mail, Trophy } from "lucide-react";

export const metadata: Metadata = {
  title: "Our Programmes",
  description:
    "Explore Love 21 Foundation's core programmes: sports, nutrition, family support, and corporate social responsibility (CSR) in Hong Kong.",
};

interface ProgramSection {
  id: string;
  title: string;
  icon: React.ElementType;
  description: string;
  secondaryText?: string;
  capabilityHighlight: string;
  badge: string;
  image: string;
  quotes?: { quote: string; author: string }[];
  highlightBox?: string;
}

const PROGRAM_SECTIONS: readonly ProgramSection[] = [
  {
    id: "sports",
    title: "Sports & Movement",
    icon: Activity,
    badge: "Core Programme",
    description:
      "Our sports programme is designed without limitations. We aim to give our beneficiaries the greatest opportunity to reach their full potential by offering a comprehensive range of activities while also striving for excellence in each sport.",
    secondaryText:
      "In addition to sport classes, we also focus on strength training, coordination and mental health activities.",
    capabilityHighlight: "Celebrating Ability: Members showcase remarkable physical resilience, pushing past perceived boundaries through structured strength and endurance training.",
    image: "/sports.jpeg",
  },
  {
    id: "nutrition",
    title: "Nutritional Care",
    icon: Utensils,
    badge: "Holistic Health",
    description:
      "Sport classes alone are not enough to significantly extend the life expectancy of our beneficiaries. This is why we’ve developed a well thought out nutrition programme to help our community, giving them the support and guidance they need to make significant healthy lifestyle changes.",
    secondaryText:
      "We also run regular cooking and food prep lessons to teach our families how to prepare these meals nutritiously and easily.",
    capabilityHighlight: "Building Independence: Equipping members and families with the hands-on kitchen skills required to drive lifelong healthy habits.",
    image: "/nutrition.jpeg",
  },
  {
    id: "family",
    title: "Family Support",
    icon: Users,
    badge: "Community First",
    description:
      "Love 21’s focus on family sets us apart. Our parent beneficiaries play a huge role in our classes and out. Family support and care for their kids is uplifting and as a charity we do all we can to support them as well as their children.",
    secondaryText:
      "We offer specialty classes for parents only and also allow parental participation in a large number of our sport and healthy lifestyle classes.",
    capabilityHighlight: "Shared Milestones: Creating a vibrant, collaborative network where parents and children learn, grow, and celebrate successes side-by-side.",
    image: "/family.jpg",
  },
  {
    id: "csr",
    title: "Corporate Social Responsibility (CSR)",
    icon: Building2,
    badge: "Partnership & Impact",
    description:
      "Our Corporate Social Responsibility Programme is an extremely important one for Hong Kong. Reason being that our beneficiaries, the Down syndrome and autistic community, are rarely seen and often misunderstood.",
    secondaryText:
      "Your employees will not only learn about our beneficiary’s amazing ability in sport, but also about their greatest ability in bringing the best out of people.",
    capabilityHighlight: "Shifting Perceptions: Allowing corporate partners to witness firsthand the extraordinary capabilities, energy, and leadership our members bring to every community workout.",
    image: "/csr.jpg",
    quotes: [
      {
        quote: "Our experience with Love 21 has been amazing. We first met with Jeff and Carmel, who explained the challenges that this community face, before assisting in a circuit training lesson where each of us took a fitness station to help the community stay active through different simple exercises. It was an incredible experience and one that will stay with us for a long time, really happy to have helped an organisation with such a great cause!",
        author: "Chaim - Argyll Scott",
      },
      {
        quote: "Volunteering at Love 21 was an eye-opening experience for us, with some delightful members and a cool space! We loved the different activities and a chance to be involved with such an amazing community ☺",
        author: "Laura – Nakama Global",
      },
    ],
    highlightBox: "If you’d like to learn more about our unique CSR Programme, please contact our Founder/CEO at jeff@love21foundation.com",
  },
];

export default function OurProgrammesPage() {
  return (
    <PageShell>
      <PageIntro
        eyebrow="What We Do"
        title="Our Programmes"
        lede="Discover how our structured sports, nutritional guidance, family support, and corporate initiatives empower the Down syndrome and autism community in Hong Kong."
      />

      <div className="mt-16 space-y-20">
        {PROGRAM_SECTIONS.map((prog, index) => {
          const Icon = prog.icon;
          const isEven = index % 2 === 0;

          return (
            <article
              key={prog.id}
              className="group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white via-white to-slate-50/80 p-8 sm:p-12 shadow-sm transition-all hover:border-red-500/30 hover:shadow-md"
            >
              <div className={`grid grid-cols-1 lg:grid-cols-12 gap-8 items-center ${isEven ? "" : "lg:grid-flow-dense"}`}>
                
                {/* Text Block */}
                <div className={`lg:col-span-7 space-y-6 ${isEven ? "" : "lg:col-start-6"}`}>
                  <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600 shadow-sm">
                      <Icon className="h-6 w-6 stroke-[1.75]" />
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-red-600 border border-red-200/60">
                      <Sparkles className="h-3.5 w-3.5" />
                      {prog.badge}
                    </span>
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    {prog.title}
                  </h2>

                  <div className="space-y-4 text-slate-600 text-base leading-relaxed">
                    <p>{prog.description}</p>
                    {prog.secondaryText && <p>{prog.secondaryText}</p>}
                  </div>

                  {/* Highlight Box Highlighting What Constituents Can Do */}
                  <div className="rounded-2xl bg-gradient-to-r from-red-50/70 to-slate-50 border border-red-100 p-4 sm:p-5 flex items-start gap-3.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600">
                      <Trophy className="h-4 w-4" />
                    </span>
                    <p className="text-xs sm:text-sm font-medium text-slate-800 leading-relaxed">
                      {prog.capabilityHighlight}
                    </p>
                  </div>

                  {/* CSR Testimonials if available */}
                  {prog.quotes && (
                    <div className="space-y-4 pt-4 border-t border-slate-100">
                      {prog.quotes.map((q, qIdx) => (
                        <blockquote key={qIdx} className="relative rounded-2xl bg-slate-50 border border-slate-200/60 p-5 text-sm space-y-2">
                          <Quote className="h-5 w-5 text-red-400 opacity-60" />
                          <p className="text-slate-700 italic leading-relaxed">"{q.quote}"</p>
                          <footer className="text-xs font-bold text-slate-900 uppercase tracking-wide">— {q.author}</footer>
                        </blockquote>
                      ))}
                    </div>
                  )}

                  {/* CSR Highlight Box / Email CTA */}
                  {prog.highlightBox && (
                    <div className="pt-2 flex flex-wrap items-center gap-4">
                      <a
                        href="mailto:jeff@love21foundation.com"
                        className="group/cta inline-flex items-center gap-3 rounded-2xl bg-slate-900 px-6 py-4 text-sm font-semibold text-white shadow-md transition-all hover:bg-red-600 hover:shadow-red-500/20"
                      >
                        <Mail className="h-4 w-4 text-red-400 group-hover/cta:text-white transition-colors" />
                        <span>Contact Jeff (Founder/CEO)</span>
                        <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover/cta:translate-x-1 group-hover/cta:text-white" />
                      </a>
                      <span className="text-sm font-medium text-slate-500">
                        for more information
                      </span>
                    </div>
                  )}
                </div>

                {/* Visual / Image Block */}
                <div className={`lg:col-span-5 ${isEven ? "" : "lg:col-start-1"}`}>
                  <div className="relative h-72 sm:h-96 w-full overflow-hidden rounded-2xl bg-slate-100 border border-slate-200/80 shadow-inner">
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/30 via-transparent to-transparent z-10" />
                    <img
                      src={prog.image}
                      alt={prog.title}
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute bottom-4 left-4 z-20">
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/90 backdrop-blur-md px-3.5 py-1.5 text-xs font-bold text-slate-900 shadow-sm">
                        Love 21 Foundation
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            </article>
          );
        })}
      </div>
    </PageShell>
  );
}