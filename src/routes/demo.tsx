import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SiteNav, SiteFooter } from "@/components/SiteNav";

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [
      { title: "Demo dashboards — CATECH Learn" },
      { name: "description", content: "Preview the Super Admin, Institution Admin, Teacher and Student dashboards of CATECH Learn." },
      { property: "og:title", content: "CATECH Learn demo dashboards" },
      { property: "og:description", content: "See what every role sees on CATECH Learn." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Demo,
});

const data = {
  "Super Admin": {
    sub: "CATECH platform overview",
    stats: [["Institutions", "42"], ["Students", "8,521"], ["Teachers", "634"], ["Courses", "412"], ["Active users", "6,284"], ["Revenue", "KSh 1,245,000"]],
    list: ["Institutions", "Subscriptions", "Payments", "Certificates", "Platform announcements", "Audit logs"],
  },
  "Institution Admin": {
    sub: "Kisii Training Institute",
    stats: [["Teachers", "38"], ["Students", "612"], ["Departments", "5"], ["Courses", "27"]],
    list: ["Departments & classes", "Academic years & terms", "Examinations", "Attendance", "Results", "Announcements"],
  },
  Teacher: {
    sub: "Kisii Training Institute · Computer Science",
    stats: [["My courses", "6"], ["My students", "248"], ["Assignments", "18"], ["Pending marking", "7"], ["Upcoming classes", "4"]],
    list: ["Create lesson", "Upload video / PDF", "New quiz or exam", "Mark assignments", "Schedule live class", "Take attendance"],
  },
  Student: {
    sub: "Good morning, Brian 👋",
    stats: [["Web Development", "78%"], ["Computer Science", "45%"], ["Mathematics", "62%"]],
    list: ["HTML Quiz", "Mathematics Assignment", "Live Class – 4:00 PM"],
  },
} as const;

type Role = keyof typeof data;

function Demo() {
  const [role, setRole] = useState<Role>("Super Admin");
  const d = data[role];
  return (
    <div className="min-h-screen">
      <SiteNav />
      <main className="mx-auto max-w-6xl px-5 py-12">
        <h1 className="text-3xl font-bold">See CATECH Learn as…</h1>
        <div className="mt-6 flex flex-wrap gap-2">
          {(Object.keys(data) as Role[]).map((r) => (
            <button key={r} onClick={() => setRole(r)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${r === role ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-muted"}`}>
              {r}
            </button>
          ))}
        </div>
        <section className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-card md:p-8">
          <p className="text-sm text-muted-foreground">{d.sub}</p>
          <h2 className="text-2xl font-bold">{role} dashboard</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {d.stats.map(([k, v]) => (
              <div key={k} className="rounded-xl bg-secondary p-5">
                <p className="text-sm text-muted-foreground">{k}</p>
                <p className="mt-1 font-display text-2xl font-extrabold">{v}</p>
                {v.endsWith("%") && <div className="mt-3 h-2 rounded-full bg-background"><div className="h-full rounded-full bg-primary" style={{ width: v }} /></div>}
              </div>
            ))}
          </div>
          <h3 className="mt-8 font-bold">{role === "Student" ? "Upcoming" : "Quick actions"}</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {d.list.map((x) => <span key={x} className="rounded-lg border border-border px-3 py-2 text-sm">{x}</span>)}
          </div>
        </section>
        <p className="mt-4 text-sm text-muted-foreground">Sample figures shown for demonstration.</p>
      </main>
      <SiteFooter />
    </div>
  );
}
