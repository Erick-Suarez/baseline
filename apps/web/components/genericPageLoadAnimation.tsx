import { BounceLoader } from "react-spinners";

export const PageLoadAnimation = () => {
  return (
    <div className="flex h-[100vh] w-[100vw] items-center justify-center">
      <BounceLoader color="#36d7b7" size={200} />
    </div>
  );
};
