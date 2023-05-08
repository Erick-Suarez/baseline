import { BaselinePrimerDialog } from "@/components/baslinePrimerDialog";
import { Chat } from "@/components/chat";
import { PageLoadAnimation } from "@/components/genericPageLoadAnimation";
import { PageWithSidebar } from "@/components/layouts/pageWithSidebar";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export default function ChatPage() {
  const session = useSession();
  const [modalIsOpen, setModalIsOpen] = useState(false);

  let chatComponent = null;
  if (session.status === "authenticated") {
    chatComponent = (
      <Chat loggedInUser={session.data.user} setModalIsOpen={setModalIsOpen} />
    );
  } else {
    chatComponent = <div>Loading</div>;
  }

  return (
    <div className="h-full w-full">
      <div className="flex h-full items-center justify-center px-5">
        <BaselinePrimerDialog
          modalIsOpen={modalIsOpen}
          setModalIsOpen={setModalIsOpen}
        />
        {chatComponent}
      </div>
    </div>
  );
}
