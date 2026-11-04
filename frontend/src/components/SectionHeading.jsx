import { ArrowRight } from 'lucide-react';

function SectionHeading({ eyebrow, title, description, linkText }) {
  return (
    <div className="section-heading">
      <div>
        <p className="section-eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        {description && <p className="section-description">{description}</p>}
      </div>
      {linkText && <a className="text-link" href="#categories">{linkText} <ArrowRight size={15} /></a>}
    </div>
  );
}

export default SectionHeading;
