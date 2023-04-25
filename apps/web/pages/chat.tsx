import { BaselinePrimerDialog } from "@/components/baslinePrimerDialog";
import { Chat } from "@/components/chat";
import { PageLoadAnimation } from "@/components/genericPageLoadAnimation";
import { PageWithSidebar } from "@/components/layouts/pageWithSidebar";

export default function ChatPage() {
  return (
    <div className="h-full w-full">
      <div className="flex h-full items-center justify-center px-5">
        <BaselinePrimerDialog />
        <Chat />
      </div>
    </div>
  );
}
