import React, { useContext } from "react";
import { IconType } from "react-icons/lib";
import {
  RiQuestionAnswerFill,
  RiStarFill,
  RiDatabase2Fill,
  RiSettings4Fill,
} from "react-icons/ri";
import Link from "next/link";
import { useRouter } from "next/router";
import classNames from "classnames";
import { BaselineContext } from "@/context/baselineContext";

export const NavMenu = () => {
  const { currentProject } = useContext(BaselineContext);
  return (
    <div className="flex w-full flex-grow flex-col">
      <NavMenuItem
        disabled={currentProject === null}
        routeLabel="Chat"
        routeIcon={RiQuestionAnswerFill}
        route="/chat"
      />
      {/* <NavMenuItem
        routeLabel="Favorites"
        routeIcon={RiStarFill}
        route="/favorites"
      /> */}
      <NavMenuItem
        routeLabel="Manage Data sources"
        routeIcon={RiDatabase2Fill}
        route="/manageData"
      />
      <NavMenuItem
        routeLabel="Settings"
        routeIcon={RiSettings4Fill}
        route="/settings"
      />
    </div>
  );
};

const NavMenuItem = ({
  disabled,
  routeLabel,
  route,
  routeIcon,
}: {
  disabled?: boolean;
  routeLabel: string;
  route: string;
  routeIcon: IconType;
}) => {
  const router = useRouter();
  const isActive = router.pathname === route;

  return (
    <div
      className={classNames("w-full rounded-lg px-5 py-3", {
        "pointer-events-none": isActive || disabled,
        "bg-indigo-200": isActive,
      })}
    >
      <Link href={route} className="group inline-flex items-center gap-1">
        {React.createElement(routeIcon, {
          className: classNames("h-5 w-5 group-hover:text-indigo-600", {
            "text-indigo-600": isActive,
            "text-slate-600": !isActive && !disabled,
            "text-slate-400": disabled,
          }),
        })}

        <h1
          className={classNames("group-hover:text-indigo-600", {
            "text-indigo-600": isActive,
            "text-slate-600": !isActive && !disabled,
            "text-slate-400": disabled,
          })}
        >
          {routeLabel}
        </h1>
      </Link>
    </div>
  );
};
