import { Sidebar } from '@components/sidebar/sidebar';

export const PageWithSidebar = ({ children }: { children: JSX.Element }) => {
  return (
    <div className="flex h-[100vh] w-[100vw]">
      <Sidebar />
      <div className="h-full w-full flex-grow">{children}</div>
    </div>
  );
};
