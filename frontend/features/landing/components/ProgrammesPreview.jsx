import GlareHover from './GlareHover';

const PROGRAMMES = [
  {
    name: 'Sports',
    tags: 'strength, mental health',
    href: '/what-we-do#sports',
    image: 'https://love21foundation.com/wp-content/uploads/2021/08/a19c3f56-b90d-4a19-b5b6-1f90b68bb103.jpg'
  },
  {
    name: 'Nutrition',
    tags: 'gut health, cooking',
    href: '/what-we-do#nutrition',
    image: 'https://love21foundation.com/wp-content/uploads/2021/08/WhatsApp-Image-2021-08-22-at-11.11.56-AM.jpeg'
  },
  {
    name: 'Family',
    tags: 'parent support',
    href: '/what-we-do#family',
    image: 'https://love21foundation.com/wp-content/uploads/2021/08/44548051-c7d1-4248-a0b5-a6243deb3644.jpg'
  },
  {
    name: 'CSR',
    tags: 'corporate volunteering',
    href: '/what-we-do#csr',
    image: 'https://love21foundation.com/wp-content/uploads/2021/08/bc61bfd9-bdf8-4117-8394-9269df16c04d.jpg'
  }
];

export default function ProgrammesPreview() {
  return (
    <section className="programmes-preview">
      <h2 className="section-heading">Our programmes</h2>
      <div className="programmes-grid">
        {PROGRAMMES.map(p => (
          <a key={p.name} href={p.href} className="programme-card-link">
            <GlareHover
              width="100%"
              height="180px"
              background={`url(${p.image}) center/cover no-repeat`}
              borderRadius="12px"
              borderColor="#e5e5e5"
              glareColor="#ffffff"
              glareOpacity={0.5}
              glareAngle={-30}
            >
              <div className="programme-card-content">
                <h3>{p.name}</h3>
                <p>{p.tags}</p>
              </div>
            </GlareHover>
          </a>
        ))}
      </div>
      <a href="/what-we-do" className="programmes-arrow">
        See all programmes &rarr;
      </a>
    </section>
  );
}
