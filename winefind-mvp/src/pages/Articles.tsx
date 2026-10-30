import { Link } from "react-router-dom";

const SEARCHES = [
  {
    label: "Wine label recognition",
    href: "https://scholar.google.com/scholar?q=wine+label+recognition",
  },
  {
    label: "Wine recommendation systems",
    href: "https://scholar.google.com/scholar?q=%22wine+recommendation%22+OR+%22wine+recommender%22",
  },
  {
    label: "WineSensed multimodal dataset",
    href: "https://scholar.google.com/scholar?q=WineSensed+multimodal+wine",
  },
  {
    label: "Restaurant wine markup / lists",
    href: "https://scholar.google.com/scholar?q=%22wine+list%22+markup+OR+%22restaurant+wine%22+pricing",
  },
  {
    label: "Food–wine pairing recommenders",
    href: "https://scholar.google.com/scholar?q=food-wine+pairing+recommender",
  },
  {
    label: "soMLier SA wine recommender",
    href: "https://scholar.google.com/scholar?q=soMLier+wine+recommender+South+Africa",
  },
];

const HIGHLIGHTS = [
  {
    title: "WineSensed — Learning to Taste (NeurIPS 2023)",
    why: "Multimodal labels + reviews + human flavor distances — backbone for taste profile & Find Wine.",
    href: "https://arxiv.org/abs/2308.16900",
    scholar:
      "https://scholar.google.com/scholar?q=Learning+to+Taste+WineSensed",
  },
  {
    title: "soMLier — South African wine recommender (2023)",
    why: "SA wines + Vivino ratings; CF + matrix factorisation + explanations — local beachhead research.",
    href: "https://doi.org/10.1080/09571264.2023.2184333",
    scholar:
      "https://scholar.google.com/scholar?q=soMLier+South+African+wine+recommender",
  },
  {
    title: "3D viewpoint augmentation for wine label recognition (2024)",
    why: "One-shot label matching with ViT metric learning — improves scan under angle/lighting.",
    href: "https://arxiv.org/pdf/2404.08820",
    scholar:
      "https://scholar.google.com/scholar?q=SINGLE-IMAGE+DRIVEN+3D+VIEWPOINT+WINE+LABEL+RECOGNITION",
  },
  {
    title: "Augmented wine recognition via OCR / SOLLAMA (2024–2025)",
    why: "OCR and MLLM approaches for label text without huge image DBs.",
    href: "https://link.springer.com/article/10.1007/s00371-023-03119-y",
    scholar:
      "https://scholar.google.com/scholar?q=Making+paper+labels+smart+for+augmented+wine+recognition",
  },
  {
    title: "Wine list disclosure & information asymmetry (JWE 2023)",
    why: "Why restaurants hide lists; experience/credence goods — frames markup transparency value.",
    href: "https://doi.org/10.1017/jwe.2023.13",
    scholar:
      "https://scholar.google.com/scholar?q=To+share+or+not+to+share+wine+list+disclosure+Swiss",
  },
  {
    title: "Restaurant bottle margins & by-the-glass (JWE 2021)",
    why: "Empirical margin behaviour for smart-savings / fair-markup UX.",
    href: "https://wine-economics.org/wp-content/uploads/2021/12/01-Vol-16-Issue03-Restaurant-Wines-Bottle-Margins-and-the-By-the-Glass-Option-by-James-A.-Dearden-Xiaohui-Guo-and-Chad-D.-Meyerhoefer.pdf",
    scholar:
      "https://scholar.google.com/scholar?q=Restaurant+Wines+Bottle+Margins+By-the-Glass+Dearden",
  },
];

export function Articles() {
  return (
    <>
      <p className="muted">
        <Link to="/">← Home</Link>
      </p>
      <h2 className="section-title">Google Scholar articles</h2>
      <p className="muted" style={{ marginBottom: 12 }}>
        Academic sources for scan, taste matching, food pairing, and restaurant
        markup. Full bibliography with DOIs:{" "}
        <code>winefind-mvp/ARTICLES.md</code>.
      </p>

      <div className="card">
        <h3>Scholar searches</h3>
        <ul className="list-clean">
          {SEARCHES.map((s) => (
            <li key={s.href}>
              <a href={s.href} target="_blank" rel="noreferrer">
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </div>

      {HIGHLIGHTS.map((paper) => (
        <div className="card" key={paper.title}>
          <h3>{paper.title}</h3>
          <p className="muted">{paper.why}</p>
          <p className="muted" style={{ marginTop: 8 }}>
            <a href={paper.href} target="_blank" rel="noreferrer">
              Read
            </a>
            {" · "}
            <a href={paper.scholar} target="_blank" rel="noreferrer">
              Google Scholar
            </a>
          </p>
        </div>
      ))}
    </>
  );
}
