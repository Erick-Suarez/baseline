import { useState } from 'react';
import { Disclosure, Dialog as HeadlessDialog } from '@headlessui/react';
import { RiArrowDropDownLine } from 'react-icons/ri';

export const BaselinePrimerDialog = () => {
  let [isOpen, setIsOpen] = useState(true);

  const _handleClose = () => {
    setIsOpen(false);
  };

  return (
    <HeadlessDialog
      open={isOpen}
      onClose={_handleClose}
      className="relative z-50 bg-black"
    >
      {/* The backdrop, rendered as a fixed sibling to the panel container */}
      <div className="fixed inset-0 bg-black/80" aria-hidden="true" />

      {/* Full-screen container to center the panel */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        {/* The actual dialog panel  */}
        <HeadlessDialog.Panel className="mx-auto flex max-w-2xl flex-col items-start gap-2 rounded-2xl bg-white p-8 shadow-xl">
          <h1 className="mb-2 text-2xl font-bold">Welcome to Baseline!</h1>
          <p className="mb-5">
            Thanks so much for trying the product. Baseline AI has been trained
            on your codebase and can aswer questions about it!
          </p>
          <div className="mb-5 flex w-full flex-col gap-3">
            <Disclosure>
              <Disclosure.Button className="flex w-full items-center justify-between rounded-lg bg-slate-200 px-4 py-2 outline-none hover:bg-indigo-100">
                Types of questions Baseline can answer
                <RiArrowDropDownLine className="h-6 w-6" />
              </Disclosure.Button>
              <Disclosure.Panel className="px-4">
                Baseline can answer questions like:
                <ul className="list-disc">
                  <li className="ml-8 mt-2">
                    How do we apply CSS to our codebase
                  </li>
                  <li className="ml-8 mt-2">
                    Give me an example of how we implement something
                  </li>
                  <li className="ml-8 mt-2">
                    What file does this component belong in
                  </li>
                  <li className="ml-8 mt-2">Why am I getting this error</li>
                  <li className="ml-8 mt-2">
                    How would I build out this new feature
                  </li>
                  <li className="ml-8 mt-2">And much more just try and ask!</li>
                </ul>
              </Disclosure.Panel>
            </Disclosure>
            <Disclosure>
              <Disclosure.Button className="flex w-full items-center justify-between rounded-lg bg-slate-200 px-4 py-2 outline-none hover:bg-indigo-100">
                Warning & advice for using Baseline
                <RiArrowDropDownLine className="h-6 w-6" />
              </Disclosure.Button>
              <Disclosure.Panel className="px-4">
                To get the best results from Baseline its best to remember a few
                points
                <ul className="list-disc">
                  <li className="ml-8 mt-2">
                    Most importantly Baseline AI is here to assist you. Do not
                    blindly follow its advice; instead use it as a guiding
                    point.
                  </li>
                  <li className="ml-8 mt-2">
                    Try to be explicit. For example try providing filenames,
                    filepaths or variable if you have questions about them
                  </li>
                  <li className="ml-8 mt-2">
                    If Baseline is having a hard time giving a useful answer
                    then just try rewording it or providing more context.
                  </li>
                  <li className="ml-8 mt-2">
                    It is better to ask how to do clear steps in a large problem
                    rather than ask how to do the large problem all at once.
                  </li>
                  <li className="ml-8 mt-2">
                    Reset the chat regularly like when you have a new query that
                    doesn't rely on the current chat
                  </li>
                </ul>
              </Disclosure.Panel>
            </Disclosure>
          </div>
          <button
            onClick={_handleClose}
            className="text-md rounded-md bg-indigo-600 px-8 py-2 text-white outline-none hover:bg-indigo-800"
          >
            Got it
          </button>
        </HeadlessDialog.Panel>
      </div>
    </HeadlessDialog>
  );
};
