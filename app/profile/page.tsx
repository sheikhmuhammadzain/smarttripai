import Link from "next/link";
import PageScaffold from "@/components/PageScaffold";
import { getAuthSession } from "@/lib/auth/get-session";

export default async function ProfilePage() {
  const session = await getAuthSession();
  const user = session?.user;

  return (
    <PageScaffold
      title="Profile"
      description="Manage account access and review your travel planning activity."
    >
      {!user?.id ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
          <p className="text-gray-700">You are not signed in.</p>
          <Link
            href="/api/auth/signin"
            className="mt-4 inline-flex rounded-full bg-[#0071eb] px-5 py-2 font-semibold text-white"
          >
            Sign In
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-gray-500">Name</dt>
              <dd className="font-semibold">{user.name ?? "Not set"}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Email</dt>
              <dd className="font-semibold">{user.email ?? "Not set"}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">User ID</dt>
              <dd className="font-mono text-xs">{user.id}</dd>
            </div>
          </dl>
          <Link href="/dashboard" className="mt-5 inline-flex rounded-full border border-gray-300 px-5 py-2 font-semibold text-gray-700">
            View Dashboard
          </Link>
        </div>
      )}
    </PageScaffold>
  );
}
