import { getAuthSession } from "@/lib/auth/get-session";
import { redirect } from "next/navigation";
import { getUserService } from "@/modules/users/user.service";
import SettingsPageClient from "./SettingsPageClient";

export const metadata = { title: "Account Settings" };

export default async function SettingsPage() {
    const session = await getAuthSession();
    const userId = session?.user?.id;
    if (!userId) {
        redirect("/auth/signin");
    }
    const account = await getUserService(userId);

    return (
        <SettingsPageClient
            initial={{
                name: account.name ?? "",
                email: account.email ?? "",
                phone: account.phone ?? "",
            }}
        />
    );
}
