"use client";

import { useState } from "react";
import { PageShell } from "@/components/layout";
import { Button, Card, PageIntro } from "@/components/ui";
import { track } from "@/features/analytics";

interface Question {
  id: number;
  question: string;
  options: {
    text: string;
    matches: string[];
  }[];
}

const QUIZ_QUESTIONS: readonly Question[] = [
  {
    id: 1,
    question: "What type of activity or environment do you feel most comfortable with?",
    options: [
      { text: "Physical activity, sports, or active community workouts", matches: ["Volunteer: Sports Coach", "Volunteer: Fitness Assistant"] },
      { text: "Hands-on preparation, cooking, or sorting supplies", matches: ["Volunteer: Nutrition & Kitchen Assistant", "Donation Wishlist"] },
      { text: "Working with youth, students, or giving presentations", matches: ["Education Programme: School Talk Presenter", "Volunteer: Workshop Mentor"] },
      { text: "Organizing events, rallying a network, or raising funds", matches: ["Raise Funds: Campaign Organizer", "Volunteer: Event Coordinator"] },
    ],
  },
  {
    id: 2,
    question: "Which specific skill set or professional background do you bring?",
    options: [
      { text: "Athletics, fitness training, or coaching experience", matches: ["Volunteer: Sports Coach"] },
      { text: "Nutrition, dietetics, or culinary skills", matches: ["Volunteer: Nutrition & Kitchen Assistant"] },
      { text: "Public speaking, teaching, or academic facilitation", matches: ["Education Programme: School Talk Presenter"] },
      { text: "Marketing, community building, or social media management", matches: ["Raise Funds: Campaign Organizer"] },
    ],
  },
  {
    id: 3,
    question: "How much time are you able to commit to the Love 21 Foundation?",
    options: [
      { text: "A one-time financial contribution or supply drop-off", matches: ["Make a Donation", "Donation Wishlist"] },
      { text: "A self-paced online fundraising campaign over a few weeks", matches: ["Raise Funds: Campaign Organizer"] },
      { text: "A regular weekly or monthly recurring volunteer shift", matches: ["Volunteer: Sports Coach", "Volunteer: Nutrition & Kitchen Assistant"] },
      { text: "An occasional school or corporate workshop engagement", matches: ["Education Programme: School Talk Presenter"] },
    ],
  },
];

export default function QuizPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<string[][]>([]);
  const [isCompleted, setIsCompleted] = useState(false);

  const handleSelectOption = (matches: string[]) => {
    const updatedAnswers = [...selectedAnswers, matches];
    setSelectedAnswers(updatedAnswers);

    // Answering the first question is starting, not loading the page. The gap
    // between the two is the number worth knowing: it says whether the quiz
    // looks worth beginning.
    if (currentStep === 0) track("quiz_started");

    if (currentStep + 1 < QUIZ_QUESTIONS.length) {
      setCurrentStep(currentStep + 1);
    } else {
      setIsCompleted(true);
      track("quiz_completed");
    }
  };

  const handleRestart = () => {
    setCurrentStep(0);
    setSelectedAnswers([]);
    setIsCompleted(false);
  };

  const matchedResults = Array.from(new Set(selectedAnswers.flat()));

  return (
    <PageShell>
      <PageIntro
        eyebrow="Matching Quiz"
        title="Find Your Perfect Role"
        lede="Answer a few quick questions to discover precise, high-impact ways you can support the Love 21 community."
      />

      {/* Main Container Wrapper with Extra Margin and Padding for Larger Images Behind */}
      <div className="relative mt-28 mb-20 max-w-2xl mx-auto py-12">
        
        {/* === MUCH LARGER IMAGES BEHIND THE CARD (Z-0) === */}
        {/* Image 1: Top Left (quiz1.jpg) - Extra large, tucked safely behind the card */}
        <img
          src="/quiz1.jpg"
          alt=""
          className="absolute -left-48 -top-28 h-80 w-80 -rotate-12 rounded-3xl object-cover shadow-2xl pointer-events-none z-0"
          aria-hidden="true"
        />
        {/* Image 2: Bottom Right (quiz2.jpg) - Extra large, tucked safely behind the card */}
        <img
          src="/quiz2.jpg"
          alt=""
          className="absolute -bottom-32 -right-48 h-96 w-96 rotate-12 rounded-3xl object-cover shadow-2xl pointer-events-none z-0"
          aria-hidden="true"
        />
        {/* === FLOATING IMAGES END === */}

        {/* Quiz Card Content with Higher Z-Index */}
        <div className="relative z-10">
          {!isCompleted ? (
            <Card as="article" panel padding="lg" className="space-y-6 shadow-2xl bg-white/95 backdrop-blur-md">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-red-600">
                <span>Question {currentStep + 1} of {QUIZ_QUESTIONS.length}</span>
                <span>{Math.round(((currentStep + 1) / QUIZ_QUESTIONS.length) * 100)}% Completed</span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-ink">
                {QUIZ_QUESTIONS[currentStep].question}
              </h2>

              <div className="space-y-3 pt-2">
                {QUIZ_QUESTIONS[currentStep].options.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectOption(option.matches)}
                    className="w-full text-left p-4 rounded-2xl border border-slate-200/80 bg-surface hover:border-red-500/50 hover:bg-red-50/35 transition-all font-medium text-ink shadow-sm"
                  >
                    {option.text}
                  </button>
                ))}
              </div>
            </Card>
          ) : (
            <Card as="article" panel padding="lg" className="space-y-6 text-center shadow-2xl bg-white/95 backdrop-blur-md">
              <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600 text-3xl mx-auto shadow-sm">
                ✨
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-ink">
                Your Personalized Matches
              </h2>
              <p className="text-ink-soft text-base leading-relaxed">
                Based on your skills, preferences, and availability, here are the specific ways you can make a meaningful impact:
              </p>

              <ul className="grid gap-3 text-left pt-2">
                {matchedResults.map((result, idx) => (
                  <li key={idx} className="p-4 rounded-2xl bg-surface border border-slate-200/80 flex items-center justify-between shadow-sm">
                    <span className="font-bold text-ink">{result}</span>
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-red-50 text-red-600 border border-red-200/60">
                      Recommended Match
                    </span>
                  </li>
                ))}
              </ul>

              <div className="pt-6 flex flex-wrap justify-center gap-4">
                <Button href="/get-involved" variant="primary">
                  Return to Get Involved
                </Button>
                <button
                  onClick={handleRestart}
                  className="px-6 py-3 rounded-xl border border-slate-300 font-semibold text-ink hover:bg-slate-100 transition-colors text-sm"
                >
                  Retake Quiz
                </button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </PageShell>
  );
}