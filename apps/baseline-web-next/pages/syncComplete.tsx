import { PageWithSidebar } from "@/components/layouts/pageWithSidebar";
import { RiCheckFill } from "react-icons/ri";

export default function SyncComplete() {
  return (
    <PageWithSidebar>
      <div className="flex h-full items-center justify-center gap-2">
        <h1 className="text-4xl font-semibold">
          Sync complete! Return to your other tab
        </h1>
        <RiCheckFill className="h-16 w-16 text-green-500" />
      </div>
    </PageWithSidebar>
  );
}
