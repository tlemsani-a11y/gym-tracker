import { getActiveProfile, listProfiles } from "@/lib/profile-session";
import { createProfileAction, renameProfileAction, deleteProfileAction } from "@/lib/actions";
import { AddItemForm, RenameButton, DeleteButton } from "@/components/CrudControls";
import { SwitchProfileButton, ImportBackupForm, MergeImportButton } from "@/components/ProfileControls";

// Importing a large backup means one big batch of inserts against a remote
// database -- give it more headroom than Vercel's short default timeout.
export const maxDuration = 60;

export default async function ProfilesPage() {
  const active = await getActiveProfile();
  const profiles = await listProfiles();

  return (
    <>
      <h1>Profiles</h1>
      <p className="muted">Profiles keep separate program lists, workout history, and stats — handy if more than one
        person uses this app. There&apos;s no password; anyone with access to the app can switch between them.</p>

      {profiles.map((p) => (
        <div key={p.id} className={`card ${p.id === active.id ? "plate-blue" : ""}`}>
          <div className="row" style={{ alignItems: "center" }}>
            <div style={{ flex: "1 1 auto" }}>
              <h2 style={{ margin: 0 }}>{p.name}</h2>
              {p.id === active.id ? <span className="muted">Currently active</span> : null}
            </div>
            {p.id !== active.id ? <SwitchProfileButton profileId={p.id} /> : null}
          </div>
          <div className="row" style={{ marginTop: "0.6rem" }}>
            <RenameButton currentName={p.name} promptLabel="Rename profile" action={renameProfileAction.bind(null, p.id)} />
            <a className="btn btn-sm" href={`/api/export?profileId=${p.id}`}>Export backup</a>
            <MergeImportButton profileId={p.id} />
            {profiles.length > 1 ? (
              <DeleteButton
                confirmMessage={`Delete profile "${p.name}" and everything in it? This cannot be undone.`}
                action={deleteProfileAction.bind(null, p.id)}
              />
            ) : null}
          </div>
        </div>
      ))}

      <div className="card">
        <h2>New profile</h2>
        <AddItemForm action={createProfileAction} placeholder="Profile name" />
      </div>

      <div className="card">
        <h2>Restore backup as a new profile</h2>
        <p className="muted">
          Import a JSON backup as a brand new profile. To add a backup&apos;s data into a profile that already
          exists instead, use <strong>Merge backup</strong> on that profile above — matching programs/exercises
          are reused and workouts already there are skipped, so it&apos;s safe to import the same file more than once.
        </p>
        <ImportBackupForm />
      </div>
    </>
  );
}
