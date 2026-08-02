import { PageShell } from "@/components/layout";
import { Card, PageIntro } from "@/components/ui";

interface TeamMember {
  name: string;
  role: string;
  imageUrl: string;
  bio: string;
}

const TEAM_MEMBERS: readonly TeamMember[] = [
  {
    name: "Carol Chan",
    role: "Director",
    imageUrl: "https://love21foundation.com/wp-content/uploads/2020/12/download.png",
    bio: "Dedicated professional bringing extensive operational and community leadership experience to the Love 21 Foundation.",
  },
  {
    name: "Eleni Symeonidou",
    role: "Director",
    imageUrl: "https://love21foundation.com/wp-content/uploads/2025/11/b79b869f-3cea-4b2c-a309-7cf990871005.jpeg",
    bio: "Passionate advocate for inclusive communities, supporting the strategic direction and holistic development programmes.",
  },
  {
    name: "Jeff Sayed",
    role: "Director",
    imageUrl: "https://love21foundation.com/wp-content/uploads/2020/02/jeff-sayed.jpg",
    bio: "Committed board member lending professional expertise and continuous dedication to empowering individuals in Hong Kong.",
  },
  {
    name: "Matthew Hosford",
    role: "Director",
    imageUrl: "https://love21foundation.com/wp-content/uploads/2020/04/thumb_284_staff_normal.jpg",
    bio: "Active community leader focused on expanding sports and active lifestyle initiatives for the Down syndrome and autistic community.",
  },
  {
    name: "Kevin Wong",
    role: "Director",
    imageUrl: "https://love21foundation.com/wp-content/uploads/2020/12/download.png",
    bio: "Brings valuable financial and operational governance experience to help strengthen and sustain the organization's mission.",
  },
  {
    name: "Young-Sook Stewart",
    role: "Director",
    imageUrl: "https://love21foundation.com/wp-content/uploads/2026/07/Youn-Sook-Stewart.jpeg",
    bio: "Deeply engaged community supporter providing invaluable guidance across outreach and family support frameworks.",
  },
  {
    name: "Lobo Cheung",
    role: "Director",
    imageUrl: "https://love21foundation.com/wp-content/uploads/2023/10/WhatsApp-Image-2023-09-04-at-11.56.01-AM.jpeg",
    bio: "Strategic contributor supporting the governance, partnerships, and long-term vision of Love 21 Foundation.",
  },
  {
    name: "Dan Maley",
    role: "Director",
    imageUrl: "https://love21foundation.com/wp-content/uploads/2023/10/1516787504378.jpg",
    bio: "Provides vital professional guidance, administrative oversight, and community connection for our growing programs.",
  },
  {
    name: "Edith Chen",
    role: "Director",
    imageUrl: "https://love21foundation.com/wp-content/uploads/2026/07/Edith-Chen.jpeg",
    bio: "Committed to expanding inclusive opportunities and supporting holistic well-being initiatives across Hong Kong.",
  },
  {
    name: "James Barrett",
    role: "Director",
    imageUrl: "https://love21foundation.com/wp-content/uploads/2026/07/James-Barrett.jpeg",
    bio: "Lends professional expertise and strategic oversight to ensure sustainable organizational growth.",
  },
  {
    name: "Raymond Tam",
    role: "Director",
    imageUrl: "https://love21foundation.com/wp-content/uploads/2026/07/Raymond-Tam.jpeg",
    bio: "Brings diverse community and business acumen to support the core mission and framework of Love 21.",
  },
  {
    name: "Dr. Ruby Ng",
    role: "Director",
    imageUrl: "https://love21foundation.com/wp-content/uploads/2020/12/download.png",
    bio: "Brings expert specialized insight and a deep passion for healthcare, nutrition, and community support.",
  },
];

export default function OurTeamPage() {
  return (
    <PageShell>
      <PageIntro
        eyebrow="Leadership"
        title="BOARD OF DIRECTORS"
        lede="Our Board of Directors is comprised of caring individuals from diverse professional backgrounds in Hong Kong, who bring their various talents and passion to support and strengthen Love 21, which is extremely important during these first few years as a new organisation."
      />

      <div className="container main-content my-12 mx-auto px-4 max-w-5xl">
        <div className="row justify-content-center">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {TEAM_MEMBERS.map((member, idx) => (
              <div key={idx} className="flex flex-col items-center">
                <Card as="article" panel padding="md" className="w-full text-center shadow-md bg-white/95 backdrop-blur-md hover:shadow-xl transition-all h-full flex flex-col justify-between">
                  <div>
                    <div className="overflow-hidden rounded-2xl mb-4 aspect-square bg-slate-100 flex items-center justify-center">
                      <img
                        src={member.imageUrl}
                        alt={member.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <h3 className="text-xl font-black text-ink mb-1">{member.name}</h3>
                    <span className="inline-block text-xs font-bold px-3 py-1 rounded-full bg-red-50 text-red-600 border border-red-200/60 mb-3">
                      {member.role}
                    </span>
                    <p className="text-ink-soft text-sm leading-relaxed mb-4">
                      {member.bio}
                    </p>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageShell>
  );
}