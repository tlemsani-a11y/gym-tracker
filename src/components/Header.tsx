import Link from "next/link";

export function Header({ profileName }: { profileName: string }) {
  const initial = profileName.trim().charAt(0).toUpperCase() || "?";
  return (
    <header>
      <Link href="/" className="brand">
        <span className="plate-dot"></span>Gym Tracker
      </Link>
      <Link href="/profiles" className="profile-chip">
        <span className="profile-chip-avatar">{initial}</span>
        <span id="profile-chip-name">{profileName}</span>
      </Link>
    </header>
  );
}
