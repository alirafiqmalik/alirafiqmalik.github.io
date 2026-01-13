import { getPageContent } from '@/lib/content';
import type { CVData } from '@/types';
import { Mail, MapPin, Globe, Download } from 'lucide-react';
import { FaGithub, FaLinkedin } from 'react-icons/fa';


export default function CVPage() {
  const cvContent = getPageContent<CVData>('cv.md');
  const cv = cvContent.data;
  

  // Get section order from the cv.md file structure, excluding contact
  const sectionOrder = Object.keys(cv).filter(
    key => key !== 'contact' && cv[key as keyof CVData]
  );

  

  const sections: Record<string, () => React.JSX.Element> = {
    education: () => (
      <section className="mb-12">
        <h2 className="mb-6 border-b border-border pb-2 text-2xl text-foreground">Education</h2>
        <div className="space-y-6">
          {cv.education?.map((edu, index) => (
            <div key={index} className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto]">
              <div>
                <h3 className="font-medium text-foreground">{edu.degree}</h3>
                <div className="text-primary">{edu.institution}</div>
                <div className="text-sm text-muted-foreground">{edu.location}</div>
                {edu.details && (
                  <div className="mt-1 text-sm text-card-foreground">{edu.details}</div>
                )}
                {edu.advisor && (
                  <div className="text-sm text-muted-foreground">{edu.advisor}</div>
                )}
              </div>
              <div className="text-muted-foreground md:text-right">{edu.year}</div>
            </div>
          ))}
        </div>
      </section>
    ),
    experience: () => (
      <section className="mb-12">
        <h2 className="mb-6 border-b border-border pb-2 text-2xl text-foreground">Experience</h2>
        <div className="space-y-8">
          {cv.experience?.map((exp, index) => (
            <div key={index} className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto]">
              <div>
                <h3 className="font-medium text-foreground">{exp.title}</h3>
                <div className="text-primary">{exp.company}</div>
                <div className="text-sm text-muted-foreground">{exp.location}</div>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-card-foreground">
                  {exp.responsibilities?.map((resp, i) => (
                    <li key={i}>{resp}</li>
                  ))}
                </ul>
              </div>
              <div className="text-muted-foreground md:text-right">{exp.year}</div>
            </div>
          ))}
        </div>
      </section>
    ),
    skills: () => (
      <section className="mb-12">
        <h2 className="mb-6 border-b border-border pb-2 text-2xl text-foreground">Skills</h2>
        <div className="space-y-4">
          {cv.skills?.map((category, index) => (
            <div key={index}>
              <h3 className="mb-2 font-medium text-foreground">{category.category}</h3>
              <div className="flex flex-wrap gap-2">
                {category.skills?.map((skill, i) => (
                  <span
                    key={i}
                    className="rounded-full border border-border px-3 py-1 text-sm text-card-foreground"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    ),
    awards: () => (
      <section className="mb-12">
        <h2 className="mb-6 border-b border-border pb-2 text-2xl text-foreground">Awards & Honors</h2>
        <div className="space-y-4">
          {cv.awards?.map((award, index) => (
            <div key={index} className="grid grid-cols-1 gap-2 md:grid-cols-[auto_1fr]">
              <div className="w-16 text-primary">{award.year}</div>
              <div>
                <h3 className="font-medium text-foreground">{award.title}</h3>
                <div className="text-sm text-muted-foreground">{award.details}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    ),
    interests: () => (
      <section className="mb-12">
        <h2 className="mb-6 border-b border-border pb-2 text-2xl text-foreground">Interests</h2>
        <ul className="list-inside list-disc space-y-2 text-card-foreground">
          {cv.interests?.map((interest: string, index: number) => (
            <li key={index}>{interest}</li>
          ))}
        </ul>
      </section>
    ),
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      {/* Contact section always renders at top */}
      <div className="mb-12">
        <h1 className="mb-4 text-4xl text-foreground">Curriculum Vitae</h1>
        
        {/* Contact Info and Social Links in one line */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <div className="flex items-center gap-2">
              <Mail size={14} />
              <a href={`mailto:${cv.contact.email}`} className="hover:text-primary">
                {cv.contact.email}
              </a>
            </div>
            
            {cv.contact.website && (
              <div className="flex items-center gap-2">
                <Globe size={14} />
                <a
                  href={`https://${cv.contact.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary"
                >
                  {cv.contact.website}
                </a>
              </div>
            )}
            
            {cv.contact.linkedin && (
              <div className="flex items-center gap-2">
                <FaLinkedin size={14} />
                <a
                  href={`https://${cv.contact.linkedin}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary"
                >
                  {cv.contact.linkedin}
                </a>
              </div>
            )}
            
            {cv.contact.github && (
              <div className="flex items-center gap-2">
                <FaGithub size={14} />
                <a
                  href={`https://${cv.contact.github}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary"
                >
                  {cv.contact.github}
                </a>
              </div>
            )}
            
            {/* Social Links */}
            <div className="flex items-center gap-3">
              {cv.contact.scholar && (
                <a
                  href={`https://${cv.contact.scholar}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground transition-colors hover:text-primary"
                  aria-label="Google Scholar"
                >
                  <GraduationCap size={20} />
                </a>
              )}
            </div>

            {/* <div className="flex items-center gap-2">
              <MapPin size={14} />
              <span>{cv.contact.location}</span>
            </div> */}
          </div>

          <a
            href="/pdf/AliMalik_Resume.pdf"
            download
            className="inline-flex items-center gap-2 rounded-md border border-primary bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Download size={16} />
            Download Resume
          </a>
        </div>
      </div>

      {/* Render sections in the order they appear in cv.md */}
      {sectionOrder.map((sectionKey) => {
        const SectionComponent = sections[sectionKey];
        return SectionComponent ? <div key={sectionKey}>{SectionComponent()}</div> : null;
      })}
    </div>
  );
}
