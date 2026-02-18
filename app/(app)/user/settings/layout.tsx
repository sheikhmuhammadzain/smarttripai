import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth/get-session";
import { getUserService } from "@/modules/users/user.service";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SettingsSidebar from "./SettingsSidebar";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const session = await getAuthSession();
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/auth/signin");
  }

  const account = await getUserService(userId);
  const firstName = (account.name ?? "").trim().split(" ")[0] || "User";

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-5xl px-4 py-10 md:px-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-start">
            <SettingsSidebar firstName={firstName} />
            <main className="flex-1 min-w-0">{children}</main>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
