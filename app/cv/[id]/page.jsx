import { notFound } from "next/navigation";
import { getApp } from "@/lib/store";
import CvPaper from "@/components/CvPaper";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const app = await getApp(id);
  return {
    title: app ? `${app.cv.name} — CV` : "CV",
    robots: { index: false, follow: false },
  };
}

/** The public page a recruiter lands on after clicking the tracked link. Clean, no Claudia branding. */
export default async function HostedCv({ params }) {
  const { id } = await params;
  const app = await getApp(id);
  if (!app?.cv) notFound();

  return (
    <main className="hosted">
      <div className="hosted-bar">
        <span>{app.cv.name}</span>
        <PrintButton />
      </div>
      <CvPaper cv={app.cv} />
    </main>
  );
}
