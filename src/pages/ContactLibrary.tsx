import { GlobalContactsManager } from "@/components/settings/GlobalContactsManager";

export default function ContactLibrary() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Contact Library</h1>
        <p className="text-muted-foreground">
          Manage your global contact database. These contacts can be imported into any project.
        </p>
      </div>
      <GlobalContactsManager />
    </div>
  );
}
