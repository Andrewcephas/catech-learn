import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteNav, SiteFooter } from "@/components/SiteNav";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CATECH Learn — E-learning platform for Kenyan institutions" },
      { name: "description", content: "One platform for schools, colleges and training centres: courses, exams, M-Pesa payments and verified certificates." },
      { property: "og:title", content: "CATECH Learn — Your Tech Partner For Success" },
      { property: "og:description", content: "Multi-institution e-learning with M-Pesa, white-labeling and certificate verification." },
    ],
  }),
  component: Index,
});

const roles = [
  { t: "Super Admin", d: "CATECH runs the whole platform: institutions, subscriptions, revenue, audit logs." },
  { t: "Institution Admin", d: "Each institution manages its own teachers, students, classes, terms and results." },
  { t: "Teacher", d: "Create lessons, upload videos and PDFs, set quizzes and exams, mark and give feedback." },
  { t: "Student", d: "Learn, submit assignments, sit exams, attend live classes and earn certificates." },
];

const plans = [
  { n: "Starter", p: "KSh 5,000", f: ["100 students", "10 teachers", "20 courses", "Basic assessments", "Basic reports"] },
  { n: "Professional", p: "KSh 10,000", hot: true, f: ["500 students", "50 teachers", "Unlimited courses", "Exams & certificates", "M-Pesa payments", "Advanced reports"] },
  { n: "Enterprise", p: "Custom", f: ["Unlimited students", "Multiple departments & campuses", "Advanced analytics", "API access", "Custom branding", "Dedicated support"] },
];

function Index() {
  return (
    <div className="min-h-screen">
      <SiteNav />
      <section className="bg-hero text-primary-foreground">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-24 md:grid-cols-2 md:items-center">
          <div>
            <p className="mb-4 inline-block rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">Built for Kenya · M-Pesa ready</p>
            <h1 className="text-4xl font-extrabold leading-tight md:text-6xl">One learning platform. Hundreds of institutions.</h1>
            <p className="mt-5 max-w-md text-lg opacity-85">CATECH Learn gives schools, colleges and training centres their own branded online campus — powered by CATECH.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/demo" className="rounded-lg bg-accent px-5 py-3 font-semibold text-accent-foreground">Explore the demo</Link>
              <a href="#pricing" className="rounded-lg border border-primary-foreground/40 px-5 py-3 font-semibold">See pricing</a>
            </div>
          </div>
          <div className="rounded-2xl bg-background p-6 text-foreground shadow-card">
            <p className="text-sm text-muted-foreground">Good morning, Brian 👋</p>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Continue learning</p>
            <p className="mt-1 font-display text-xl font-bold">Web Development</p>
            <div className="mt-3 h-2.5 rounded-full bg-muted"><div className="h-full w-[78%] rounded-full bg-primary" /></div>
            <p className="mt-1 text-right text-xs text-muted-foreground">78%</p>
            <div className="mt-5 space-y-2 text-sm">
              {["HTML Quiz", "Mathematics Assignment", "Live Class – 4:00 PM"].map((x) => (
                <div key={x} className="rounded-lg bg-secondary px-3 py-2">{x}</div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="text-3xl font-bold">A dashboard for everyone</h2>
        <p className="mt-2 text-muted-foreground">Each institution's data stays completely separate.</p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {roles.map((r, i) => (
            <div key={r.t} className="rounded-xl border border-border bg-card p-6">
              <span className="font-display text-sm font-bold text-primary">0{i + 1}</span>
              <h3 className="mt-2 text-lg font-bold">{r.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{r.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-secondary">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 md:grid-cols-3">
          {[
            { t: "M-Pesa built in", d: "Enroll → pay with STK Push → course unlocks instantly. Institutions pay their subscription the same way." },
            { t: "Your brand, your domain", d: "kti.catech.co.ke or learn.kti.ac.ke — with your logo, colours and name." },
            { t: "Verified certificates", d: "Every certificate gets a unique ID and QR code anyone can scan to verify." },
          ].map((f) => (
            <div key={f.t}>
              <h3 className="text-xl font-bold">{f.t}</h3>
              <p className="mt-2 text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="text-3xl font-bold">Simple monthly plans</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {plans.map((p) => (
            <div key={p.n} className={`rounded-2xl border p-7 ${p.hot ? "border-primary bg-primary text-primary-foreground shadow-card" : "border-border bg-card"}`}>
              <h3 className="text-lg font-bold">{p.n}</h3>
              <p className="mt-3 font-display text-3xl font-extrabold">{p.p}<span className="text-sm font-medium opacity-70">{p.p !== "Custom" && "/month"}</span></p>
              <ul className="mt-6 space-y-2 text-sm">
                {p.f.map((f) => <li key={f}>✓ {f}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
