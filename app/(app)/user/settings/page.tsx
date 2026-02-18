import { getAuthSession } from "@/lib/auth/get-session";
import { getUserService } from "@/modules/users/user.service";
import SettingsPageClient from "./SettingsPageClient";

export const metadata = { title: "Account Settings" };

export default async function SettingsPage() {
    const session = await getAuthSession();
    // layout.tsx handles the redirect if not authenticated
    const userId = session?.user?.id!;
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
