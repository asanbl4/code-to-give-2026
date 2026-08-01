'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Activity, Utensils, Users, Target, ArrowRight, HeartHandshake, Brain, Sparkles, BookOpen, Quote } from 'lucide-react';
import { PageShell } from '@/components/layout';
import { PageIntro } from '@/components/ui';

interface Pillar {
  title: string;
  description: string;
  icon: React.ElementType;
}

export default function WhoWeArePage() {
  const pillars: Pillar[] = [
    {
      title: 'Sports & Movement',
      description:
        'Offering tailored sports classes—from football and basketball to yoga and surfing—designed to improve health, physical fitness, and social skills.',
      icon: Activity,
    },
    {
      title: 'Nutritional Care',
      description:
        'Providing professional nutritional support, 1-on-1 dietetic advice, and cooking workshops to ensure holistic well-being for our community.',
      icon: Utensils,
    },
    {
      title: 'Community & Inclusion',
      description:
        'Fostering a supportive environment where individuals with Down syndrome and autism and their families build friendships, confidence, and independence.',
      icon: Users,
    },
  ];

  return (
    <PageShell>
      {/* Page Header */}
      <PageIntro
        eyebrow="Who We Are"
        title="Empowering Potential Through Action"
        lede="Love 21 Foundation is a Hong Kong-based charity dedicated to empowering the Down syndrome and autism community through sports, nutrition, and holistic support."
      />

      <div className="mt-12 w-full max-w-5xl mx-auto space-y-16">
        
        {/* SECTION 1: OUR STORY */}
        <section className="rounded-3xl border border-slate-200/80 bg-white p-8 sm:p-12 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Story Text */}
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-100 text-red-600">
                  <HeartHandshake className="h-4 w-4" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-red-600">
                  Our Journey
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Our Story
              </h2>

              <p className="text-slate-600 text-base leading-relaxed">
                LOVE 21 is a charity dedicated to empowering the Down syndrome and autistic community in Hong Kong through sport, nutrition, and holistic support programmes.
              </p>
              
              <p className="text-slate-600 text-base leading-relaxed">
                Since the launch of our comprehensive nutrition programme in 2021, we’ve provided one-on-one nutritional support on top of the sports classes that we’ve offered. We’ve also recently expanded into providing counselling support for the parents of our community.
              </p>
            </div>

            {/* Story Image Container */}
            <div className="relative h-72 sm:h-80 md:h-full w-full min-h-[280px] overflow-hidden rounded-2xl bg-slate-100 border border-slate-200/80">
              <Image
                src="/our-story.jpg"
                alt="Love 21 community and sports session"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
              />
            </div>
          </div>
        </section>

        {/* SECTION 2: OUR MISSION */}
        <section className="relative overflow-hidden rounded-3xl bg-slate-900 p-8 sm:p-12 text-white shadow-xl">
          <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-red-600/20 blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-3xl space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full bg-red-500/10 px-3.5 py-1 text-xs font-semibold text-red-400 border border-red-500/20">
              <Target className="h-3.5 w-3.5" />
              Our Mission
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Unlocking the potential of every individual
            </h2>
            <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
              At Love 21, we believe that with the right opportunities and support, individuals with Down syndrome and autism can reach unimaginable heights. We aim to break barriers, foster long-term physical and mental health, and nurture a society where everyone belongs.
            </p>
          </div>
        </section>

        {/* SECTION 3: EDUCATING ON NEURODIVERGENCE */}
        <section className="rounded-3xl border border-slate-200/80 bg-white p-8 sm:p-12 shadow-sm space-y-10">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-100 text-red-600">
              <Brain className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-red-600">
              Understanding Our Community
            </span>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Embracing Neurodiversity
            </h2>
            <p className="text-slate-600 text-base leading-relaxed">
              Neurodiversity highlights that people experience and interact with the world in diverse ways; there is no single "right" way of thinking, learning, or behaving. At Love 21, we champion this full spectrum, supporting individuals with Down syndrome and autism not just through childhood and school years, but well into adulthood.
            </p>
          </div>

          {/* Highlighted Purposeful Employment Paragraph */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-50 via-rose-50/50 to-slate-50 border border-red-200/60 p-6 sm:p-8">
            <div className="absolute right-4 top-4 text-red-200 pointer-events-none">
              <Quote className="h-16 w-16 opacity-40 rotate-180" />
            </div>
            <div className="relative z-10 flex items-start gap-4">
              <span className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-600 text-white shadow-md shadow-red-500/20">
                <Sparkles className="h-5 w-5" />
              </span>
              <div className="space-y-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-red-600">
                  Driving Towards the Future
                </h3>
                <p className="text-slate-800 text-base sm:text-lg font-medium leading-relaxed">
                  Hong Kong’s Love 21 Foundation aims to prove those with Down’s syndrome, autism ready for purposeful employment, equipping them with the vital skills, self-assurance, and real-world opportunities needed to thrive independently in the modern workforce.
                </p>
              </div>
            </div>
          </div>

          {/* Education Image Placeholder */}
          <div className="relative h-64 sm:h-80 w-full overflow-hidden rounded-2xl bg-slate-100 border border-slate-200/80">
            <Image 
              src="/neurodiversity-education.png" 
              alt="Neurodiversity education community" 
              fill 
              className="object-cover" 
            /> 
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Down Syndrome Card */}
            <div className="rounded-2xl bg-slate-50 border border-slate-200/60 p-6 space-y-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600 font-bold text-sm">
                  21
                </span>
                <h3 className="text-lg font-bold text-slate-900">Down Syndrome</h3>
              </div>
              <p className="text-sm leading-relaxed text-slate-600">
                Caused by an extra 21st chromosome, Down syndrome is a genetic condition associated with physical growth differences, mild to moderate intellectual disability, and unique emotional strengths. With proper health management, adapted physical activity, and continuous encouragement, individuals lead vibrant, active lives.
              </p>
            </div>

            {/* Autism Spectrum Card */}
            <div className="rounded-2xl bg-slate-50 border border-slate-200/60 p-6 space-y-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600">
                  <Sparkles className="h-5 w-5" />
                </span>
                <h3 className="text-lg font-bold text-slate-900">Autism Spectrum</h3>
              </div>
              <p className="text-sm leading-relaxed text-slate-600">
                Autism is a neurological condition influencing communication, social interaction, and sensory processing. Because it is a diverse spectrum, every individual's experience is unique. Structured environments, tailored sports, and patient mentorship help autistic individuals thrive and build deep self-confidence.
              </p>
            </div>
          </div>

          {/* Link to Personal Stories Page */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100">
            <div className="space-y-1 text-center sm:text-left">
              <h4 className="font-bold text-slate-900 text-base">Hear From Our Community</h4>
              <p className="text-sm text-slate-600">Discover personal journeys, triumphs, and daily life experiences in our stories section.</p>
            </div>
            <Link
              href="/stories"
              className="group inline-flex shrink-0 items-center gap-2 rounded-xl bg-red-50 px-5 py-3 text-sm font-semibold text-red-600 transition-all hover:bg-red-100 border border-red-200/60"
            >
              <BookOpen className="h-4 w-4" />
              <span>Read Personal Stories</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </section>

        {/* Core Pillars / What We Do */}
        <section className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-tight">
              Our Core Focus Areas
            </h2>
            <p className="mt-2 text-sm sm:text-base text-slate-600">
              How we create meaningful, lasting change in Hong Kong
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {pillars.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <Link
                  key={pillar.title}
                  href="/what-we-do"
                  className="group block rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm hover:border-red-500/50 hover:shadow-md transition-all"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600 mb-5 group-hover:bg-red-600 group-hover:text-white transition-colors">
                    <Icon className="h-6 w-6 stroke-[1.75]" />
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-red-600 transition-colors">
                      {pillar.title}
                    </h3>
                    <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-red-600" />
                  </div>
                  <p className="text-sm leading-relaxed text-slate-600">
                    {pillar.description}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>

        {/* SECTION 4: OUR TEAM */}
        <section className="rounded-3xl border border-slate-200/80 bg-white p-8 sm:p-12 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Team Text */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-700">
                <Users className="h-3.5 w-3.5 text-red-600" />
                The People Behind Love 21
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Our Team
              </h2>

              <p className="text-slate-600 text-base leading-relaxed">
                Our dedicated team of founders, coaches, dietitians, and community coordinators work tirelessly to create a safe, supportive, and empowering environment for our members and their families.
              </p>

              <div>
                <Link
                  href="/our-team"
                  className="group inline-flex items-center justify-center gap-2.5 rounded-2xl bg-slate-900 px-7 py-4 text-sm font-semibold text-white shadow-md transition-all hover:bg-red-600 hover:shadow-red-500/20"
                >
                  <span>Meet Our Team & Leadership</span>
                  <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-white" />
                </Link>
              </div>
            </div>

            {/* Team Image Container */}
            <div className="relative h-72 sm:h-80 md:h-full w-full min-h-[280px] overflow-hidden rounded-2xl bg-slate-100 border border-slate-200/80">
              <Image
                src="/our-team.jpg"
                alt="Love 21 team and leadership"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          </div>
        </section>

        {/* Call to Action Banner */}
        <section className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-red-50 to-slate-50 p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
          <div className="space-y-2 text-center sm:text-left">
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
              Want to join our mission?
            </h3>
            <p className="text-sm text-slate-600 max-w-lg">
              Whether you want to volunteer, participate in events, or support us through donations, your support makes a world of difference.
            </p>
          </div>
          <Link
            href="/get-involved"
            className="group inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3.5 text-sm font-semibold text-white transition-all hover:bg-red-700 shadow-md shadow-red-500/10"
          >
            <span>Get Involved</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </section>

      </div>
    </PageShell>
  );
}