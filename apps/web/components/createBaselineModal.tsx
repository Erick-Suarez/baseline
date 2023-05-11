import { useState } from "react";
import { Disclosure, Dialog as HeadlessDialog } from "@headlessui/react";
import { RiArrowDropDownLine } from "react-icons/ri";
import { Input } from "@/components/input";
import {
  Project,
  createEmbeddingFromRepositoryRequest,
} from "@baselinedocs/shared";
import { parseCookies } from "nookies";
import { convertGlobStringToStringArray } from "@/utils/utils";

export const CreateBaselineModal = ({
  modalIsOpen,
  handleModalClose,
  includeValue,
  setIncludeValue,
  excludeValue,
  setExcludeValue,
  projectData,
  forceRefresh,
}: {
  modalIsOpen: boolean;
  handleModalClose: () => void;
  includeValue: string;
  setIncludeValue: React.Dispatch<React.SetStateAction<string>>;
  excludeValue: string;
  setExcludeValue: React.Dispatch<React.SetStateAction<string>>;
  projectData: Project;
  forceRefresh: () => void;
}) => {
  return (
    <HeadlessDialog
      open={modalIsOpen}
      onClose={handleModalClose}
      className="relative z-50"
    >
      {/* The backdrop, rendered as a fixed sibling to the panel container */}
      <div className="fixed inset-0 bg-black/80" aria-hidden="true" />

      {/* Full-screen container to center the panel */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        {/* The actual dialog panel  */}
        <HeadlessDialog.Panel className="mx-auto flex max-w-2xl flex-col items-start gap-2 rounded-2xl bg-white p-8 shadow-xl">
          <h1 className="border-b-4 border-indigo-600 pb-1 text-4xl font-bold">
            Create baseline
          </h1>
          <p className="mt-4 text-gray-400">
            This will train a chat model on you repository. Add glob patterns
            for what files and directories should be included / excluded during
            training. You can delimit different glob patterns by seperating it
            with a comma.
          </p>
          <p className="mb-4 mt-1 font-bold text-gray-400">
            Example: *.pattern1, **/**.pattern2
          </p>

          <h2>Include Pattern</h2>
          <Input
            value={includeValue}
            onChange={(e) => {
              setIncludeValue(e.target.value);
            }}
            className="mb-4"
          />

          <h2>Exclude Pattern</h2>
          <Input
            value={excludeValue}
            onChange={(e) => {
              setExcludeValue(e.target.value);
            }}
            className="mb-4"
          />

          <div className="flex w-full items-center justify-end">
            <button
              className="rounded-md px-8 py-4 text-gray-600 hover:bg-gray-200"
              onClick={() => {
                handleModalClose();
              }}
            >
              Cancel
            </button>
            <button
              className="rounded-md bg-indigo-600 px-8 py-4 text-white hover:bg-indigo-400"
              onClick={() => {
                const payload: createEmbeddingFromRepositoryRequest = {
                  repo_id: projectData.id,
                  repo_name: projectData.name,
                  include: convertGlobStringToStringArray(includeValue),
                  exclude: convertGlobStringToStringArray(excludeValue),
                };
                fetch(
                  `${process.env.NEXT_PUBLIC_BASELINE_BACKEND_URL}/baseline`,
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `BEARER ${
                        parseCookies()["baseline.access-token"]
                      }`,
                    },
                    body: JSON.stringify(payload),
                  }
                )
                  .then((res) => res.json())
                  .then((data) => {
                    forceRefresh();
                    handleModalClose();
                  })
                  .catch((err) => {
                    /* TODO: Handle Error */
                  });
              }}
            >
              Create
            </button>
          </div>
        </HeadlessDialog.Panel>
      </div>
    </HeadlessDialog>
  );
};
