import React from "react";
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

export const NavMenu = () => {
  return (
    <div className="flex w-full flex-grow flex-col">
      <NavMenuItem
        routeLabel="Chat"
        routeIcon={RiQuestionAnswerFill}
        route="/chat"
      />
      <NavMenuItem
        routeLabel="Favorites"
        routeIcon={RiStarFill}
        route="/favorites"
      />
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
  routeLabel,
  route,
  routeIcon,
}: {
  routeLabel: string;
  route: string;
  routeIcon: IconType;
}) => {
  const router = useRouter();
  const isActive = router.pathname === route;

  return (
    <div
      className={classNames("w-full rounded-lg px-5 py-3", {
        "pointer-events-none bg-indigo-200": isActive,
      })}
    >
      <Link href={route} className="group inline-flex items-center gap-1">
        {React.createElement(routeIcon, {
          className: classNames("h-5 w-5 group-hover:text-indigo-600", {
            "text-indigo-600": isActive,
            "text-slate-600": !isActive,
          }),
        })}

        <h1
          className={classNames("group-hover:text-indigo-600", {
            "text-indigo-600": isActive,
            "text-slate-600": !isActive,
          })}
        >
          {routeLabel}
        </h1>
      </Link>
    </div>
  );
};
