import Link from "next/link";
import { Button, Section } from "@/components/ui";
import { GlareHover } from "@/components/vendor/GlareHover";
import { PROGRAMMES } from "../data";

export function ProgrammesPreview() {
  return (
    <div className="mx-auto w-full max-w-6xl px-5 pb-14 sm:px-8">
      <Section title="Our programmes">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PROGRAMMES.map((programme) => (
            <li key={programme.name}>
              <Link href={programme.href} className="block">
                <GlareHover
                  height="180px"
                  background={`url(${programme.image}) center/cover no-repeat`}
                  borderRadius="var(--radius-card)"
                  borderColor="var(--color-edge)"
                  glareOpacity={0.5}
                  glareAngle={-30}
                >
                  {/* Scrim: the photographs vary, the caption must stay legible. */}
                  <div className="flex h-full w-full flex-col justify-end bg-linear-to-t from-ink/85 to-transparent p-4 text-white">
                    <h3 className="font-display text-xl font-bold">{programme.name}</h3>
                    <p className="text-sm">{programme.tags}</p>
                  </div>
                </GlareHover>
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-6">
          <Button href="/what-we-do" variant="secondary">
            See all programmes →
          </Button>
        </div>
      </Section>
    </div>
  );
}
