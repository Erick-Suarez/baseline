import { BaselineContext } from "@/context/baselineContext";
import { Tab } from "@headlessui/react";
import { useSession } from "next-auth/react";
import { parseCookies } from "nookies";
import { useContext, useEffect, useState } from "react";
import {
  updateUserDisplayNameRequest,
  updateUserPasswordRequest,
} from "@baselinedocs/shared";
import assert from "assert";

export default function SettingsPage() {
  const session = useSession();
  const {} = useContext(BaselineContext);
  const [displayName, setDisplayName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  useEffect(() => {
    if (session.status === "authenticated" && session.data) {
      setDisplayName(session.data.user.name);
      setInitialLoadComplete(true);
    }
  }, [session.status, session.data]);

  const _changeDisplayNameRequest = () => {
    assert(session.data, "No session data");

    const payload: updateUserDisplayNameRequest = {
      user_id: session.data.user.user_id,
      new_displayName: displayName,
    };

    fetch(`${process.env.NEXT_PUBLIC_BASELINE_BACKEND_URL}/user/name`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `BEARER ${parseCookies()["baseline.access-token"]}`,
      },
      body: JSON.stringify(payload),
    }).then((res) => {
      if (res.status === 200) {
        session.update({ name: displayName });
        alert("Name successfully changed");
      }
    });
  };

  const _updatePasswordRequest = () => {
    assert(session.data);

    const payload: updateUserPasswordRequest = {
      user_id: session.data.user.user_id,
      current_password: currentPassword,
      new_password: newPassword,
    };

    fetch(`${process.env.NEXT_PUBLIC_BASELINE_BACKEND_URL}/user/password`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `BEARER ${parseCookies()["baseline.access-token"]}`,
      },
      body: JSON.stringify(payload),
    }).then((res) => {
      if (res.status === 200) {
        alert("Password successfully changed");
        setNewPassword("");
        setCurrentPassword("");
      }
    });
  };

  return (
    <div className="mt-20 h-full w-full">
      <h1 className="mb-20 text-center text-4xl font-bold">Settings</h1>
      {initialLoadComplete ? (
        <div className="w-full">
          <div className="flex w-full flex-col px-20">
            <div className="flex items-center justify-center gap-10 border-b-2 border-slate-200 px-10 pb-16 pt-6">
              <div className="flex flex-1 flex-col gap-5">
                <h1 className="text-2xl font-bold">Display Name</h1>
                <p className="text-slate-400">
                  Change your display name, This will also change your profile
                  initials
                </p>
              </div>
              <div className="flex flex-1 items-center gap-5">
                <input
                  type="text"
                  className="w-full rounded-md border bg-slate-100 p-4 outline-slate-600"
                  value={displayName}
                  onChange={(e) => {
                    setDisplayName(e.target.value);
                  }}
                />
                <button
                  onClick={() => {
                    _changeDisplayNameRequest();
                  }}
                  className="rounded-md bg-indigo-600 px-10 py-4 text-lg font-bold text-white hover:bg-indigo-800"
                >
                  Update
                </button>
              </div>
            </div>
            <div className="flex items-center justify-center gap-10 border-b-2 border-slate-200 px-10 pb-16 pt-6">
              <div className="flex flex-1 flex-col gap-5">
                <h1 className="text-2xl font-bold">Password</h1>
                <p className="text-slate-400">Change your password</p>
              </div>
              <div className="flex flex-1 items-center gap-5">
                <input
                  type="password"
                  placeholder="current password"
                  className="w-full rounded-md border bg-slate-100 p-4 outline-slate-600"
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value);
                  }}
                />
                <input
                  type="password"
                  placeholder="new password"
                  className="w-full rounded-md border bg-slate-100 p-4 outline-slate-600"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                  }}
                />
                <button
                  onClick={() => {
                    _updatePasswordRequest();
                  }}
                  className="rounded-md bg-indigo-600 px-10 py-4 text-lg font-bold text-white hover:bg-indigo-800"
                >
                  Update
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div>Loading</div>
      )}
    </div>
  );
}
